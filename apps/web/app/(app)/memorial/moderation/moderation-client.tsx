"use client";

import { useState } from "react";

import styles from "../memorial.module.css";

interface Contribution {
  id: string;
  displayName: string;
  relationship: string;
  textContent: string | null;
  photoBlobPathname: string | null;
}

export function ModerationClient({ spaceId, items: initial }: { spaceId: string; items: Contribution[] }) {
  const [items, setItems] = useState(initial);

  async function moderate(id: string, status: "approved" | "rejected") {
    await fetch(`/api/spaces/${spaceId}/contributions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contributionId: id, status }),
    });
    setItems((current) => current.filter((row) => row.id !== id));
  }

  return (
    <>
      {items.map((row) => (
        <div key={row.id} className={styles.card}>
          {row.photoBlobPathname && (
            <img src={row.photoBlobPathname} alt="" style={{ width: "100%", borderRadius: "0.75rem", marginBottom: "0.75rem" }} />
          )}
          <p style={{ fontWeight: 600 }}>
            {row.displayName} · {row.relationship}
          </p>
          {row.textContent && <p>{row.textContent}</p>}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button type="button" className={styles.primary} onClick={() => moderate(row.id, "approved")}>
              Approve
            </button>
            <button type="button" className={styles.secondary} onClick={() => moderate(row.id, "rejected")}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
