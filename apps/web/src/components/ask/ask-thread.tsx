"use client";

import { FlowerMark } from "@/src/components/ui/FlowerMark";
import styles from "./ask-thread.module.css";

export type AskCitation = {
  itemId: string;
  title: string;
  excerpt: string;
  origin?: "from_them" | "about_them";
};

export type HimmelMessage = {
  id: string;
  role: "himmel";
  text: string;
  outcome: "answered" | "abstained" | "refused" | "error";
  citations: AskCitation[];
  canAddQuestion?: boolean;
  questionDraft?: {
    text: string;
    locale: string;
    reason: string;
    originKind?: "ask_abstain";
  } | null;
  userQuestion?: string;
  addQuestionState?: "idle" | "loading" | "done";
};

export type UserMessage = { id: string; role: "user"; text: string };

export type ThreadMessage = UserMessage | HimmelMessage;

export function AskThread({
  intro,
  messages,
  thinkingLabel,
  onOpenEvidence,
  onAddQuestion,
  addQuestionLabel,
  addedQuestionLabel,
  sourcesLabel,
  abstainedBody,
}: {
  intro: string;
  messages: ThreadMessage[];
  thinkingLabel: string | null;
  onOpenEvidence: (citations: AskCitation[]) => void;
  onAddQuestion: (messageId: string) => void;
  addQuestionLabel: string;
  addedQuestionLabel: string;
  sourcesLabel: string;
  abstainedBody: string;
}) {
  return (
    <div className={styles.thread}>
      {messages.length === 0 ? (
        <div className={styles.introBlock}>
          <FlowerMark size={72} />
          <p className={styles.intro}>{intro}</p>
        </div>
      ) : null}
      <ul className={styles.list} aria-live="polite">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <li key={msg.id} className={styles.userRow}>
              <p className={styles.userBubble}>{msg.text}</p>
            </li>
          ) : (
            <li key={msg.id} className={styles.himmelRow}>
              <div className={styles.himmelBubble}>
                <p className={styles.answerText}>{msg.text}</p>
                {msg.outcome === "abstained" ? (
                  <p className={styles.abstainNote}>{abstainedBody}</p>
                ) : null}
                {msg.citations.length > 0 ? (
                  <button
                    type="button"
                    className={styles.sourcesLink}
                    onClick={() => onOpenEvidence(msg.citations)}
                  >
                    {sourcesLabel}
                  </button>
                ) : null}
                {msg.canAddQuestion && msg.outcome === "abstained" ? (
                  <button
                    type="button"
                    className={styles.addQuestion}
                    disabled={msg.addQuestionState === "loading" || msg.addQuestionState === "done"}
                    onClick={() => onAddQuestion(msg.id)}
                  >
                    {msg.addQuestionState === "done" ? addedQuestionLabel : addQuestionLabel}
                  </button>
                ) : null}
              </div>
            </li>
          ),
        )}
        {thinkingLabel ? (
          <li className={styles.himmelRow}>
            <div className={[styles.himmelBubble, styles.thinking].join(" ")}>
              <p className={styles.answerText}>{thinkingLabel}</p>
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
