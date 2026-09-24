import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..", "..");
const scanRoots = [join(repoRoot, "apps"), join(repoRoot, "packages")];
const allowedExtensions = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
]);
const skippedDirectories = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  "drizzle",
]);
const selfPath = fileURLToPath(import.meta.url);

const guardrails = [
  {
    id: "generateSpeech-call",
    message: "Found generateSpeech() usage, which would add synthetic speech generation.",
    pattern: /\bgenerateSpeech\s*\(/,
  },
  {
    id: "provider-speech-factory",
    message: "Found providerClient.speech(...), which would add a TTS model.",
    pattern: /\.\s*speech\s*\(/,
  },
  {
    id: "tts-dependency",
    message: "Found a known TTS / voice-cloning dependency reference.",
    pattern:
      /["'`](?:@?elevenlabs(?:\/[^"'`]+)?|@playht\/[^"'`]+|playht|cartesia|google-cloud\/text-to-speech)["'`]/i,
  },
  {
    id: "tts-model-id",
    message: "Found a known TTS / speech-synthesis model identifier.",
    pattern: /["'`](?:gpt-4o-mini-tts|sonic(?:-2)?|text-to-speech|voice-clone)[^"'`]*["'`]/i,
  },
  {
    id: "voice-clone-call",
    message: "Found an explicit voice-cloning helper call.",
    pattern: /\b(?:cloneVoice|voiceClone)\s*\(/,
  },
];

interface Violation {
  guardrailId: string;
  message: string;
  file: string;
  line: number;
  snippet: string;
}

async function* walk(directory: string): AsyncGenerator<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (skippedDirectories.has(entry.name)) {
        continue;
      }
      yield* walk(join(directory, entry.name));
      continue;
    }

    const extension = extname(entry.name);
    if (allowedExtensions.has(extension)) {
      yield join(directory, entry.name);
    }
  }
}

async function scanFile(path: string): Promise<Violation[]> {
  if (path === selfPath) {
    return [];
  }

  const content = await readFile(path, "utf-8");
  const lines = content.split(/\r?\n/);
  const violations: Violation[] = [];

  lines.forEach((line, index) => {
    for (const guardrail of guardrails) {
      if (!guardrail.pattern.test(line)) {
        continue;
      }

      violations.push({
        guardrailId: guardrail.id,
        message: guardrail.message,
        file: relative(repoRoot, path),
        line: index + 1,
        snippet: line.trim(),
      });
    }
  });

  return violations;
}

export async function runGuardrailCheck(): Promise<void> {
  const violations: Violation[] = [];

  for (const scanRoot of scanRoots) {
    for await (const path of walk(scanRoot)) {
      violations.push(...(await scanFile(path)));
    }
  }

  if (violations.length === 0) {
    console.log("TC-061 guardrails: PASS");
    return;
  }

  console.error("TC-061 guardrails: FAIL");
  for (const violation of violations) {
    console.error(
      `- [${violation.guardrailId}] ${violation.file}:${violation.line} ${violation.message}`,
    );
    console.error(`  ${violation.snippet}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runGuardrailCheck().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
