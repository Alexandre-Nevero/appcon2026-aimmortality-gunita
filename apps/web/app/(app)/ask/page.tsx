"use client";

import { ORIGIN_LABELS } from "@gunita/core";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { AskInput } from "@/src/components/ask/ask-input";
import {
  AskThread,
  type AskCitation,
  type HimmelMessage,
  type ThreadMessage,
} from "@/src/components/ask/ask-thread";
import { EvidenceSheet } from "@/src/components/ask/evidence-sheet";
import { BackHeader } from "@/src/components/ui/BackHeader";
import { useI18n } from "@/src/i18n/provider";
import { demoSpaceId } from "@/src/mocks/demo-path";
import { fixtures } from "@/src/mocks/fixtures";
import styles from "./ask-page.module.css";

type AskApiResponse = {
  outcome: HimmelMessage["outcome"];
  text: string;
  evidenceGroups: {
    fromThem: Array<{ itemId: string; title: string; body: string }>;
    othersRemember: Array<{ itemId: string; title: string; body: string }>;
  };
  canAddQuestion: boolean;
  questionDraft: { text: string; locale: string; reason: string; originKind: "ask_abstain" } | null;
};

function nextId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function flattenEvidence(data: AskApiResponse["evidenceGroups"]): AskCitation[] {
  const mapCards = (
    cards: Array<{ itemId: string; title: string; body: string }>,
    origin: AskCitation["origin"],
  ) =>
    cards.map((c) => ({
      itemId: c.itemId,
      title: c.title,
      excerpt: c.body,
      origin,
    }));
  return [...mapCards(data.fromThem, "from_them"), ...mapCards(data.othersRemember, "about_them")];
}

function himmelFromApi(data: AskApiResponse, userQuestion: string): HimmelMessage {
  return {
    id: nextId(),
    role: "himmel",
    text: data.text,
    outcome: data.outcome,
    citations: flattenEvidence(data.evidenceGroups),
    canAddQuestion: data.canAddQuestion,
    questionDraft: data.questionDraft,
    userQuestion,
    addQuestionState: "idle",
  };
}

function himmelFromFixtureAbstain(
  abstainText: string,
  userQuestion: string,
  locale: string,
): HimmelMessage {
  return {
    id: nextId(),
    role: "himmel",
    text: abstainText,
    outcome: "abstained",
    citations: [],
    canAddQuestion: true,
    questionDraft: {
      text: userQuestion,
      locale,
      reason: "Ask abstained — not yet in archive.",
      originKind: "ask_abstain" as const,
    },
    userQuestion,
    addQuestionState: "idle",
  };
}

export default function AskPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [thinking, setThinking] = useState(false);
  const [evidence, setEvidence] = useState<AskCitation[]>([]);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const suggested = fixtures.interviewQuestions;

  const askQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || thinking) return;

      setMessages((prev) => [...prev, { id: nextId(), role: "user", text: trimmed }]);
      setThinking(true);

      const spaceId = demoSpaceId();
      let himmel: HimmelMessage;

      try {
        if (!spaceId) throw new Error("no_space");
        const res = await fetch(`/api/spaces/${spaceId}/ask`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
        });
        if (!res.ok) throw new Error("ask_failed");
        const data = (await res.json()) as AskApiResponse;
        himmel = himmelFromApi(data, trimmed);
      } catch {
        himmel = himmelFromFixtureAbstain(t("ask.abstained"), trimmed, locale);
      }

      setMessages((prev) => [...prev, himmel]);
      setThinking(false);
    },
    [locale, t, thinking],
  );

  const onAddQuestion = useCallback(
    async (messageId: string) => {
      const spaceId = demoSpaceId();
      const target = messagesRef.current.find(
        (m): m is HimmelMessage => m.role === "himmel" && m.id === messageId,
      );
      const draft =
        target?.questionDraft ??
        (target?.userQuestion
          ? {
              text: target.userQuestion,
              locale,
              reason: "Ask abstained — not yet in archive.",
              originKind: "ask_abstain" as const,
            }
          : null);

      setMessages((prev) =>
        prev.map((m) =>
          m.role === "himmel" && m.id === messageId
            ? { ...m, addQuestionState: "loading" as const }
            : m,
        ),
      );

      try {
        if (!spaceId || !draft?.text.trim()) throw new Error("skip");
        const res = await fetch(`/api/spaces/${spaceId}/questions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...draft, originKind: "ask_abstain" }),
        });
        if (!res.ok) throw new Error("question_failed");
      } catch {
        /* offline demo: still show added feedback */
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.role === "himmel" && m.id === messageId
            ? { ...m, addQuestionState: "done" as const }
            : m,
        ),
      );
    },
    [locale],
  );

  return (
    <main className={styles.page}>
      <BackHeader
        title={t("ask.title").toLowerCase()}
        backLabel={t("common.back").toLowerCase()}
        onBack={() => router.push("/home")}
      />
      <div className={styles.body}>
        <AskThread
          intro={t("ask.emptyIdle")}
          messages={messages}
          thinkingLabel={thinking ? t("ask.thinking") : null}
          onOpenEvidence={(citations) => {
            setEvidence(citations);
            setEvidenceOpen(true);
          }}
          onAddQuestion={onAddQuestion}
          addQuestionLabel={t("ask.addAsQuestion").toLowerCase()}
          addedQuestionLabel={t("ask.addedAsQuestion").toLowerCase()}
          sourcesLabel={t("ask.evidence").toLowerCase()}
          abstainedBody={t("ask.abstainedBody")}
        />
        <AskInput
          placeholder={t("ask.placeholder")}
          sendLabel={t("ask.send")}
          suggested={suggested}
          suggestedLabel={t("ask.suggestions")}
          disabled={thinking}
          onSubmit={askQuestion}
          onPickSuggested={askQuestion}
        />
      </div>
      <EvidenceSheet
        open={evidenceOpen}
        title={t("ask.evidence").toLowerCase()}
        emptyLabel={t("ask.evidenceEmpty")}
        citeHint={t("ask.citeHint")}
        closeLabel={t("common.close").toLowerCase()}
        fromThemLabel={ORIGIN_LABELS.from_them[locale]}
        aboutThemLabel={ORIGIN_LABELS.about_them[locale]}
        citations={evidence}
        onClose={() => setEvidenceOpen(false)}
      />
    </main>
  );
}
