const checkpoints = [
  "pnpm workspace configured",
  "Next.js 16 App Router scaffold ready",
  "packages/core stub reserved for later tasks",
];

export default function Home() {
  return (
    <main
      style={{
        width: "min(100%, 48rem)",
        margin: "0 auto",
        padding: "4rem 1.5rem",
      }}
    >
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--accent)",
            fontSize: "0.875rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          TASK-001
        </p>
        <h1 style={{ margin: "0.75rem 0 1rem", fontSize: "2.25rem", lineHeight: 1.1 }}>
          GUNITA scaffold is ready.
        </h1>
        <p style={{ margin: 0, fontSize: "1rem", lineHeight: 1.6 }}>
          This workspace now has the minimal monorepo and Next.js foundation needed for the team to
          start building features in later tasks.
        </p>
        <ul style={{ margin: "1.5rem 0 0", paddingLeft: "1.25rem", lineHeight: 1.8 }}>
          {checkpoints.map((checkpoint) => (
            <li key={checkpoint}>{checkpoint}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
