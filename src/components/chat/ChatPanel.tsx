"use client";

interface Props {
  provider: "claude" | "codex";
  projectPath: string | null;
}

export default function ChatPanel({ provider, projectPath }: Props) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: "8px" }}>
      <div style={{ fontSize: "32px" }}>{provider === "claude" ? "◆" : "◇"}</div>
      <p style={{ fontSize: "14px", fontWeight: 600 }}>{provider === "claude" ? "Claude" : "Codex"} Chat</p>
      <p style={{ fontSize: "12px", textAlign: "center", maxWidth: "240px" }}>
        AI chat integration coming soon. Use the terminal to run{" "}
        <code style={{ fontFamily: "monospace", background: "var(--bg)", padding: "1px 4px", borderRadius: "3px" }}>
          {provider === "claude" ? "claude" : "codex"}
        </code>{" "}
        for now.
      </p>
      {projectPath && <p style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>{projectPath}</p>}
    </div>
  );
}
