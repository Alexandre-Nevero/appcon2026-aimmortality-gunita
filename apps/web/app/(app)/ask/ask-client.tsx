"use client";

import { useState } from "react";
import type { Locale } from "@gunita/core";

import { ProvenanceBadges } from "@/src/components/badges";
import { t } from "@/src/i18n/t";
import styles from "./ask.module.css";

interface EvidenceCard {
  itemId: string;
  title: string;
  body: string;
  origin: "from_them" | "about_them";
  reviewState: "verified" | "corrected" | "uncertain" | "disputed" | "ai_suggestion" | "rejected";
}

interface AskResult {
  outcome: "answered" | "abstained" | "refused" | "error";
  text: string;
  unsupportedParts: string[];
  abstentionText: string | null;
  evidenceGroups: { fromThem: EvidenceCard[]; othersRemember: EvidenceCard[] };
  canAddQuestion: boolean;
  questionDraft: { text: string; locale: Locale; reason: string; originKind: "ask_abstain" } | null;
}

export function AskClient({
  spaceId,
  locale,
  featuredName,
}: {
  spaceId: string;
  locale: Locale;
  featuredName: string | null;
}) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [pending, setPending] = useState(false);
  const [queued, setQueued] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setPending(true);
    setQueued(false);
    try {
      const response = await fetch(`/api/spaces/${spaceId}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = (await response.json()) as AskResult;
      setResult(data);
    } finally {
      setPending(false);
    }
  }

  async function addAsQuestion() {
    if (!result?.questionDraft) return;
    await fetch(`/api/spaces/${spaceId}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(result.questionDraft),
    });
    setQueued(true);
  }

  return (
    <>
      <h1 className={styles.title}>{t("tabs.ask", locale)}</h1>
      <p className={styles.subtitle}>
        {featuredName ? `${t("app.tagline", locale)} — ${featuredName}` : t("app.tagline", locale)}
      </p>

      {!result && (
        <div className={styles.suggestions}>
          <p>&ldquo;Paano gumawa ng adobo si Lola Nena?&rdquo;</p>
          <p>&ldquo;Ano ang ginagawa tuwing Undas?&rdquo;</p>
        </div>
      )}

      {result && (
        <div
          className={`${styles.answer} ${result.outcome === "abstained" ? styles.abstain : ""} ${
            result.outcome === "refused" ? styles.refused : ""
          }`}
        >
          <p>{result.text}</p>

          {result.canAddQuestion && !queued && (
            <button type="button" className={styles.addQuestion} onClick={addAsQuestion}>
              + Add as a Himmel Question
            </button>
          )}
          {queued && <p>✓ Added to the question queue.</p>}

          {result.evidenceGroups.fromThem.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupLabel}>{t("badges.inTheirOwnWords", locale)}</p>
              {result.evidenceGroups.fromThem.map((card) => (
                <div key={card.itemId} className={styles.card}>
                  <p>{card.title}</p>
                  <ProvenanceBadges origin={card.origin} reviewState={card.reviewState} locale={locale} />
                </div>
              ))}
            </div>
          )}

          {result.evidenceGroups.othersRemember.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupLabel}>{t("badges.othersRemember", locale)}</p>
              {result.evidenceGroups.othersRemember.map((card) => (
                <div key={card.itemId} className={styles.card}>
                  <p>{card.title}</p>
                  <ProvenanceBadges origin={card.origin} reviewState={card.reviewState} locale={locale} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && ask()}
          placeholder={t("tabs.ask", locale)}
        />
        <button type="button" className={styles.send} onClick={ask} disabled={pending} aria-label={t("common.submit", locale)}>
          ↑
        </button>
      </div>
    </>
  );
}
