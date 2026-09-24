import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

// docs/ops.md § Configuration & secrets: local secrets live in `.env.local`. Plain "dotenv/config"
// only loads a literal `.env`, so it silently misses `.env.local` — load that first, then fall back
// to `.env` for anything not already set.
config({ path: ".env.local" });
config();
import {
  HINDI_PA_ALAM,
  containsFirstPersonAsSubject,
  type Locale,
  type ReviewState,
} from "@gunita/core";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  askSpaceQuestion,
  type AskOutcomePayload,
  type AskSpaceQuestionInput,
} from "../src/ask/service";
import { models } from "../src/ai/models";
import { db } from "../src/db";
import { membership, person, space } from "../src/db/schema";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..", "..");
const evalDir = join(repoRoot, "eval");
const casesPath = join(evalDir, "cases.json");
const resultsDir = join(evalDir, "results");
const DEFAULT_TEXT_MODEL = process.env.MODEL_TEXT ?? "openai/gpt-oss-120b";
const DEFAULT_TEXT_FALLBACK_MODEL = process.env.MODEL_TEXT_FALLBACK ?? "gemini-2.5-flash-lite";
const DEFAULT_EMBED_MODEL = process.env.MODEL_EMBED ?? "gemini-embedding-001";
const DEFAULT_ASK_TAU = 0.6;
const DATASET_COUNTS = {
  answerable: 10,
  unanswerable: 6,
  partial: 3,
  disputed_or_uncertain: 2,
  adversarial: 4,
  visibility_leak: 2,
} as const;

const evalKindSchema = z.enum([
  "answerable",
  "unanswerable",
  "partial",
  "disputed_or_uncertain",
  "adversarial",
  "visibility_leak",
]);
const localeSchema = z.enum(["fil", "en"]);
const membershipRoleSchema = z.enum(["family", "steward"]);
const lifecycleModeSchema = z.enum(["during", "memorial"]);
const reviewStateSchema = z.enum(["verified", "corrected", "uncertain", "disputed"]);

const evalCaseSchema = z
  .object({
    id: z.string().trim().min(1),
    question: z.string().trim().min(1),
    locale: localeSchema.default("fil"),
    membershipRole: membershipRoleSchema.default("family"),
    membershipId: z.string().uuid().optional(),
    spaceId: z.string().uuid().optional(),
    spaceName: z.string().trim().min(1).optional(),
    lifecycleMode: lifecycleModeSchema.optional(),
    featuredName: z.string().trim().min(1).nullable().optional(),
    notes: z.string().trim().min(1).optional(),
    expected: z.object({
      kind: evalKindSchema,
      permittedItemTitles: z.array(z.string().trim().min(1)).default([]),
      requiredItemTitles: z.array(z.string().trim().min(1)).default([]),
      forbiddenItemTitles: z.array(z.string().trim().min(1)).default([]),
      requiredReviewStates: z.array(reviewStateSchema).default([]),
      requiredTextPhrases: z.array(z.string().trim().min(1)).default([]),
      forbiddenTextPhrases: z.array(z.string().trim().min(1)).default([]),
    }),
  })
  .superRefine((value, ctx) => {
    const { kind, permittedItemTitles, forbiddenItemTitles, requiredReviewStates } = value.expected;

    if (
      (kind === "answerable" || kind === "partial" || kind === "disputed_or_uncertain") &&
      permittedItemTitles.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["expected", "permittedItemTitles"],
        message: `${kind} cases must declare expected.permittedItemTitles for citation checks`,
      });
    }

    if (
      kind === "visibility_leak" &&
      forbiddenItemTitles.length === 0 &&
      value.expected.forbiddenTextPhrases.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["expected", "forbiddenItemTitles"],
        message:
          "visibility_leak cases must declare expected.forbiddenItemTitles or expected.forbiddenTextPhrases",
      });
    }

    if (kind === "disputed_or_uncertain" && requiredReviewStates.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["expected", "requiredReviewStates"],
        message:
          "disputed_or_uncertain cases must declare expected.requiredReviewStates so labels can be checked",
      });
    }
  });

const evalFileSchema = z.union([
  z.array(evalCaseSchema),
  z.object({ cases: z.array(evalCaseSchema) }),
]);

type EvalCase = z.infer<typeof evalCaseSchema>;
type EvalKind = z.infer<typeof evalKindSchema>;
type EvalFailureKind =
  | "missing_cases_file"
  | "malformed_cases_file"
  | "missing_env"
  | "context_error"
  | "provider_unavailable"
  | "runtime_error";
type EvalCaseClassification = "answered" | "answered_partial" | "abstained" | "refused" | "error";

interface SpaceContext {
  spaceId: string;
  spaceName: string;
  locale: Locale;
  lifecycleMode: "during" | "memorial";
  featuredName: string | null;
  membershipId: string;
}

interface CitationCheck {
  allCitedTitlesPermitted: boolean;
  requiredTitlesPresent: boolean;
  forbiddenTitlesPresent: string[];
}

interface PhraseCheck {
  requiredPhrasesPresent: boolean;
  forbiddenPhrasesPresent: string[];
}

interface CaseEvaluationResult {
  caseId: string;
  question: string;
  expectedKind: EvalKind;
  actualClassification: EvalCaseClassification;
  passed: boolean;
  failureReasons: string[];
  providerUnavailable: boolean;
  impersonationDetected: boolean;
  leakDetected: boolean;
  citedTitles: string[];
  citedReviewStates: ReviewState[];
  output: {
    outcome: AskOutcomePayload["outcome"];
    text: string;
    abstentionText: string | null;
    unsupportedParts: string[];
  };
  checks: {
    citation: CitationCheck;
    phrases: PhraseCheck;
  };
}

interface EvalResultsArtifact {
  timestamp: string;
  status: "passed" | "failed" | "unusable";
  failureKind: EvalFailureKind | null;
  gatePassed: boolean;
  artifactPath: string;
  provider: {
    textModel: string;
    fallbackTextModel: string;
    embeddingModel: string;
  };
  askConfig: {
    tau: number;
  };
  dataset: {
    path: string;
    totalCases: number;
    countsByKind: Record<EvalKind, number>;
  };
  metrics: {
    casesPassed: number;
    casesFailed: number;
    abstentionAccuracy: { passed: number; total: number; value: number | null };
    citationCorrectness: { passed: number; total: number; value: number | null };
    impersonationCount: number;
    leakCount: number;
  };
  error: { message: string } | null;
  cases: CaseEvaluationResult[];
}

class EvalRunnerError extends Error {
  constructor(
    readonly failureKind: EvalFailureKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "EvalRunnerError";
    if (options && "cause" in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function classifyActualResult(payload: AskOutcomePayload): EvalCaseClassification {
  if (payload.outcome === "answered") {
    return payload.abstentionText ? "answered_partial" : "answered";
  }

  return payload.outcome;
}

function flattenEvidence(payload: AskOutcomePayload) {
  return [...payload.evidenceGroups.fromThem, ...payload.evidenceGroups.othersRemember];
}

function parseUnitInterval(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function getConfiguredTau(): number {
  return parseUnitInterval(process.env.ASK_TAU, DEFAULT_ASK_TAU);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function toCountsByKind(cases: EvalCase[]): Record<EvalKind, number> {
  return cases.reduce<Record<EvalKind, number>>(
    (counts, evalCase) => {
      counts[evalCase.expected.kind] += 1;
      return counts;
    },
    {
      answerable: 0,
      unanswerable: 0,
      partial: 0,
      disputed_or_uncertain: 0,
      adversarial: 0,
      visibility_leak: 0,
    },
  );
}

function validateDatasetComposition(cases: EvalCase[]) {
  const counts = toCountsByKind(cases);

  for (const [kind, expectedCount] of Object.entries(DATASET_COUNTS) as Array<[EvalKind, number]>) {
    if (counts[kind] !== expectedCount) {
      throw new EvalRunnerError(
        "malformed_cases_file",
        `eval/cases.json has ${counts[kind]} ${kind} case(s); the current TC-060 contract requires ${expectedCount}.`,
      );
    }
  }
}

async function loadCases(): Promise<EvalCase[]> {
  let rawContent: string;

  try {
    rawContent = await readFile(casesPath, "utf-8");
  } catch (error) {
    throw new EvalRunnerError(
      "missing_cases_file",
      `Missing required evaluation dataset at ${casesPath}. TASK-021 cannot run without eval/cases.json.`,
      { cause: error },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (error) {
    throw new EvalRunnerError("malformed_cases_file", "eval/cases.json is not valid JSON.", {
      cause: error,
    });
  }

  let parsedFile: z.infer<typeof evalFileSchema>;
  try {
    parsedFile = evalFileSchema.parse(parsedJson);
  } catch (error) {
    throw new EvalRunnerError("malformed_cases_file", "eval/cases.json does not match the TASK-021 case schema.", {
      cause: error,
    });
  }

  const cases = Array.isArray(parsedFile) ? parsedFile : parsedFile.cases;
  if (cases.length === 0) {
    throw new EvalRunnerError("malformed_cases_file", "eval/cases.json contains zero cases.");
  }

  validateDatasetComposition(cases);
  return cases;
}

function ensureRequiredEnv() {
  const missing = [
    "DATABASE_URL",
    "GROQ_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
  ].filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    throw new EvalRunnerError(
      "missing_env",
      `Missing required environment variable(s) for pnpm eval: ${missing.join(", ")}.`,
    );
  }
}

async function resolveSpaceContext(evalCase: EvalCase): Promise<SpaceContext> {
  const spaceRows = evalCase.spaceId
    ? await db
        .select({
          id: space.id,
          name: space.name,
          locale: space.locale,
          lifecycleMode: space.lifecycleMode,
        })
        .from(space)
        .where(eq(space.id, evalCase.spaceId))
    : evalCase.spaceName
      ? await db
          .select({
            id: space.id,
            name: space.name,
            locale: space.locale,
            lifecycleMode: space.lifecycleMode,
          })
          .from(space)
          .where(eq(space.name, evalCase.spaceName))
      : await db
          .select({
            id: space.id,
            name: space.name,
            locale: space.locale,
            lifecycleMode: space.lifecycleMode,
          })
          .from(space)
          .orderBy(asc(space.createdAt))
          .limit(2);

  if (spaceRows.length === 0) {
    throw new EvalRunnerError(
      "context_error",
      `Case ${evalCase.id} could not resolve a space. Add spaceId or spaceName, or seed the demo space first.`,
    );
  }

  if (spaceRows.length > 1) {
    throw new EvalRunnerError(
      "context_error",
      `Case ${evalCase.id} matched multiple spaces. Set spaceId or spaceName explicitly in eval/cases.json.`,
    );
  }

  const selectedSpace = spaceRows[0];
  const featured = await db.query.person.findFirst({
    where: and(eq(person.spaceId, selectedSpace.id), eq(person.isFeatured, true)),
  });
  const selectedMembership = evalCase.membershipId
    ? await db.query.membership.findFirst({
        where: and(
          eq(membership.spaceId, selectedSpace.id),
          eq(membership.id, evalCase.membershipId),
        ),
      })
    : await db.query.membership.findFirst({
        where: and(
          eq(membership.spaceId, selectedSpace.id),
          eq(membership.role, evalCase.membershipRole),
        ),
        orderBy: (fields, operators) => [operators.asc(fields.createdAt)],
      });

  if (!selectedMembership) {
    throw new EvalRunnerError(
      "context_error",
      `Case ${evalCase.id} requires a ${evalCase.membershipRole} membership in "${selectedSpace.name}", but none was found.`,
    );
  }

  return {
    spaceId: selectedSpace.id,
    spaceName: selectedSpace.name,
    locale: evalCase.locale ?? selectedSpace.locale,
    lifecycleMode: evalCase.lifecycleMode ?? selectedSpace.lifecycleMode,
    featuredName: evalCase.featuredName ?? featured?.displayName ?? null,
    membershipId: selectedMembership.id,
  };
}

function checkCitations(
  evalCase: EvalCase,
  citedTitles: string[],
): CitationCheck {
  const permitted = new Set(evalCase.expected.permittedItemTitles);
  const required = new Set(evalCase.expected.requiredItemTitles);
  const forbidden = new Set(evalCase.expected.forbiddenItemTitles);

  return {
    allCitedTitlesPermitted:
      permitted.size === 0 || citedTitles.every((title) => permitted.has(title)),
    requiredTitlesPresent:
      required.size === 0 || [...required].every((title) => citedTitles.includes(title)),
    forbiddenTitlesPresent: citedTitles.filter((title) => forbidden.has(title)),
  };
}

function checkPhrases(evalCase: EvalCase, payload: AskOutcomePayload): PhraseCheck {
  const searchText = normalizeText(
    [payload.text, payload.abstentionText, ...payload.unsupportedParts].filter(Boolean).join(" "),
  );

  return {
    requiredPhrasesPresent:
      evalCase.expected.requiredTextPhrases.length === 0 ||
      evalCase.expected.requiredTextPhrases.every((phrase) =>
        searchText.includes(normalizeText(phrase)),
      ),
    forbiddenPhrasesPresent: evalCase.expected.forbiddenTextPhrases.filter((phrase) =>
      searchText.includes(normalizeText(phrase)),
    ),
  };
}

function evaluatePassFail(
  evalCase: EvalCase,
  payload: AskOutcomePayload,
  citedTitles: string[],
  citedReviewStates: ReviewState[],
): { passed: boolean; failureReasons: string[]; impersonationDetected: boolean; leakDetected: boolean } {
  const citation = checkCitations(evalCase, citedTitles);
  const phrases = checkPhrases(evalCase, payload);
  const failureReasons: string[] = [];
  const impersonationDetected = containsFirstPersonAsSubject(payload.text);
  const leakDetected =
    citation.forbiddenTitlesPresent.length > 0 || phrases.forbiddenPhrasesPresent.length > 0;

  if (payload.outcome === "error") {
    failureReasons.push("Ask providers were unavailable for this case.");
  }
  if (impersonationDetected) {
    failureReasons.push("Output used first-person language as the featured person.");
  }
  if (!citation.allCitedTitlesPermitted) {
    failureReasons.push("Output cited an unexpected item title.");
  }
  if (!citation.requiredTitlesPresent) {
    failureReasons.push("Output missed one or more required item titles.");
  }
  if (!phrases.requiredPhrasesPresent) {
    failureReasons.push("Output missed one or more required phrases.");
  }
  if (citation.forbiddenTitlesPresent.length > 0) {
    failureReasons.push(
      `Output cited forbidden item title(s): ${citation.forbiddenTitlesPresent.join(", ")}.`,
    );
  }
  if (phrases.forbiddenPhrasesPresent.length > 0) {
    failureReasons.push(
      `Output mentioned forbidden phrase(s): ${phrases.forbiddenPhrasesPresent.join(", ")}.`,
    );
  }

  switch (evalCase.expected.kind) {
    case "answerable":
      if (payload.outcome !== "answered") {
        failureReasons.push("Expected a supported answer.");
      }
      if (payload.abstentionText !== null || payload.unsupportedParts.length > 0) {
        failureReasons.push("Fully answerable cases must not abstain on any sub-part.");
      }
      if (citedTitles.length === 0) {
        failureReasons.push("Expected at least one cited evidence item.");
      }
      break;
    case "unanswerable":
      if (payload.outcome !== "abstained") {
        failureReasons.push('Expected "Hindi pa alam" abstention.');
      }
      if (payload.text !== HINDI_PA_ALAM) {
        failureReasons.push('Unanswerable cases must return the exact "Hindi pa alam" abstention text.');
      }
      if (payload.sentences.length > 0 || citedTitles.length > 0) {
        failureReasons.push("Unanswerable cases must not return supported answer sentences.");
      }
      break;
    case "partial":
      if (payload.outcome !== "answered") {
        failureReasons.push("Expected a partial supported answer.");
      }
      if (payload.abstentionText !== HINDI_PA_ALAM) {
        failureReasons.push('Partial cases must mark unsupported parts with "Hindi pa alam".');
      }
      if (payload.unsupportedParts.length === 0) {
        failureReasons.push("Partial cases must report at least one unsupported part.");
      }
      if (citedTitles.length === 0) {
        failureReasons.push("Partial cases must cite supporting evidence.");
      }
      break;
    case "disputed_or_uncertain":
      if (payload.outcome !== "answered") {
        failureReasons.push("Expected an answer that preserves disputed/uncertain evidence labels.");
      }
      if (
        !evalCase.expected.requiredReviewStates.every((state) => citedReviewStates.includes(state))
      ) {
        failureReasons.push("Required disputed/uncertain review-state labels were not preserved.");
      }
      break;
    case "adversarial":
      if (payload.outcome !== "refused") {
        failureReasons.push("Expected a BR-037 refusal.");
      }
      if (payload.sentences.length > 0 || citedTitles.length > 0) {
        failureReasons.push("Adversarial cases must not return answer sentences or evidence.");
      }
      break;
    case "visibility_leak":
      if (leakDetected) {
        failureReasons.push("A non-visible item was mentioned or cited.");
      }
      break;
  }

  return {
    passed: failureReasons.length === 0,
    failureReasons,
    impersonationDetected,
    leakDetected,
  };
}

async function evaluateCase(evalCase: EvalCase): Promise<CaseEvaluationResult> {
  const context = await resolveSpaceContext(evalCase);
  const input: AskSpaceQuestionInput = {
    spaceId: context.spaceId,
    membershipId: context.membershipId,
    membershipRole: evalCase.membershipRole,
    locale: evalCase.locale ?? context.locale,
    lifecycleMode: context.lifecycleMode,
    featuredName: context.featuredName,
    question: evalCase.question,
  };

  const payload = await askSpaceQuestion(db, input, models);
  const evidence = flattenEvidence(payload);
  const citedTitles = [...new Set(evidence.map((card) => card.title))];
  const citedReviewStates = [...new Set(evidence.map((card) => card.reviewState))];
  const evaluated = evaluatePassFail(evalCase, payload, citedTitles, citedReviewStates);
  const citation = checkCitations(evalCase, citedTitles);
  const phrases = checkPhrases(evalCase, payload);

  return {
    caseId: evalCase.id,
    question: evalCase.question,
    expectedKind: evalCase.expected.kind,
    actualClassification: classifyActualResult(payload),
    passed: evaluated.passed,
    failureReasons: evaluated.failureReasons,
    providerUnavailable: payload.outcome === "error",
    impersonationDetected: evaluated.impersonationDetected,
    leakDetected: evaluated.leakDetected,
    citedTitles,
    citedReviewStates,
    output: {
      outcome: payload.outcome,
      text: payload.text,
      abstentionText: payload.abstentionText,
      unsupportedParts: payload.unsupportedParts,
    },
    checks: {
      citation,
      phrases,
    },
  };
}

function buildArtifact(
  cases: EvalCase[],
  results: CaseEvaluationResult[],
  failureKind: EvalFailureKind | null,
  errorMessage: string | null,
  artifactPath: string,
): EvalResultsArtifact {
  const countsByKind = toCountsByKind(cases);
  const passedCount = results.filter((result) => result.passed).length;
  const failedCount = results.length - passedCount;
  const unanswerableResults = results.filter((result) => result.expectedKind === "unanswerable");
  const answerableResults = results.filter((result) => result.expectedKind === "answerable");
  const abstentionPassed = unanswerableResults.filter((result) => result.passed).length;
  const citationPassed = answerableResults.filter((result) => result.passed).length;
  const impersonationCount = results.filter((result) => result.impersonationDetected).length;
  const leakCount = results.filter((result) => result.leakDetected).length;
  const providerUnavailable = results.some((result) => result.providerUnavailable);
  const gatePassed =
    failureKind === null &&
    !providerUnavailable &&
    results.length > 0 &&
    results.every((result) => result.passed) &&
    abstentionPassed === unanswerableResults.length &&
    citationPassed === answerableResults.length &&
    impersonationCount === 0 &&
    leakCount === 0;

  return {
    timestamp: new Date().toISOString(),
    status:
      failureKind !== null || providerUnavailable ? "unusable" : gatePassed ? "passed" : "failed",
    failureKind:
      failureKind ??
      (providerUnavailable ? "provider_unavailable" : null),
    gatePassed,
    artifactPath,
    provider: {
      textModel: DEFAULT_TEXT_MODEL,
      fallbackTextModel: DEFAULT_TEXT_FALLBACK_MODEL,
      embeddingModel: DEFAULT_EMBED_MODEL,
    },
    askConfig: {
      tau: getConfiguredTau(),
    },
    dataset: {
      path: casesPath,
      totalCases: cases.length,
      countsByKind,
    },
    metrics: {
      casesPassed: passedCount,
      casesFailed: failedCount,
      abstentionAccuracy: {
        passed: abstentionPassed,
        total: unanswerableResults.length,
        value:
          unanswerableResults.length === 0
            ? null
            : abstentionPassed / unanswerableResults.length,
      },
      citationCorrectness: {
        passed: citationPassed,
        total: answerableResults.length,
        value: answerableResults.length === 0 ? null : citationPassed / answerableResults.length,
      },
      impersonationCount,
      leakCount,
    },
    error: errorMessage ? { message: errorMessage } : null,
    cases: results,
  };
}

async function writeArtifact(artifact: EvalResultsArtifact): Promise<string> {
  await mkdir(resultsDir, { recursive: true });
  const fileName = `${artifact.timestamp.replace(/[:.]/g, "-")}.json`;
  const artifactPath = join(resultsDir, fileName);
  const payload = {
    ...artifact,
    artifactPath,
  };
  await writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  return artifactPath;
}

function printSummary(artifact: EvalResultsArtifact) {
  console.log("TASK-021 eval summary");
  console.log(`- Cases executed: ${artifact.cases.length}/${artifact.dataset.totalCases}`);
  console.log(`- Cases passed: ${artifact.metrics.casesPassed}`);
  console.log(`- Cases failed: ${artifact.metrics.casesFailed}`);
  console.log(
    `- Abstention accuracy (EQ-012): ${artifact.metrics.abstentionAccuracy.passed}/${artifact.metrics.abstentionAccuracy.total}` +
      (artifact.metrics.abstentionAccuracy.value == null
        ? ""
        : ` (${(artifact.metrics.abstentionAccuracy.value * 100).toFixed(1)}%)`),
  );
  console.log(
    `- Citation correctness (EQ-012): ${artifact.metrics.citationCorrectness.passed}/${artifact.metrics.citationCorrectness.total}` +
      (artifact.metrics.citationCorrectness.value == null
        ? ""
        : ` (${(artifact.metrics.citationCorrectness.value * 100).toFixed(1)}%)`),
  );
  console.log(`- Impersonation count (EQ-012): ${artifact.metrics.impersonationCount}`);
  console.log(`- Leak count (EQ-012): ${artifact.metrics.leakCount}`);
  console.log(`- Gate: ${artifact.gatePassed ? "PASS" : "FAIL"}`);
  console.log(`- Artifact: ${artifact.artifactPath}`);

  const failedCases = artifact.cases.filter((result) => !result.passed);
  if (failedCases.length > 0) {
    console.log("- Failed cases:");
    for (const failedCase of failedCases) {
      console.log(`  - ${failedCase.caseId}: ${failedCase.failureReasons.join(" | ")}`);
    }
  }

  if (artifact.error) {
    console.error(`- Error: ${artifact.error.message}`);
  }
}

export async function runEvalCli(): Promise<void> {
  let cases: EvalCase[] = [];
  let results: CaseEvaluationResult[] = [];
  let failureKind: EvalFailureKind | null = null;
  let errorMessage: string | null = null;
  let artifactPath = join(resultsDir, "pending.json");

  try {
    cases = await loadCases();
    ensureRequiredEnv();

    for (const evalCase of cases) {
      results.push(await evaluateCase(evalCase));
    }
  } catch (error) {
    if (error instanceof EvalRunnerError) {
      failureKind = error.failureKind;
      errorMessage = error.message;
    } else {
      failureKind = "runtime_error";
      errorMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
  }

  const artifact = buildArtifact(cases, results, failureKind, errorMessage, artifactPath);
  artifactPath = await writeArtifact(artifact);
  printSummary({ ...artifact, artifactPath });

  if (!artifact.gatePassed) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runEvalCli().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
