"use client";

interface Props {
  orchestrator: "claude" | "codex";
  activeProject: string | null;
}

export default function StatusBar({ orchestrator, activeProject }: Props) {
  return (
    <footer style={{
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "0 16px",
      height: "24px",
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      fontSize: "11px",
      color: "var(--muted)",
      flexShrink: 0,
    }}>
      <span style={{ color: "var(--accent)" }}>● {orchestrator}</span>
      {activeProject && <span>project: {activeProject}</span>}
      <span style={{ marginLeft: "auto" }}>ForgeOS v0.1.0</span>
    </footer>
  );
}
