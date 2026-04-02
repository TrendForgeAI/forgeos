"use client";

import UserMenu from "./UserMenu";

interface User {
  name: string;
  email: string;
  role: string;
}

interface Props {
  user: User;
  orchestrator: "claude" | "codex";
  layout: "single" | "split-h" | "split-v";
  onOrchestratorChange: (o: "claude" | "codex") => void;
  onToggleSidebar: () => void;
  onLayoutChange: (l: "single" | "split-h" | "split-v") => void;
  onOpenGlobalSettings: () => void;
  onOpenProjectSettings: () => void;
}

export default function MenuBar({ user, orchestrator, layout, onOrchestratorChange, onToggleSidebar, onLayoutChange, onOpenGlobalSettings, onOpenProjectSettings }: Props) {
  const layoutBtn = (l: "single" | "split-h" | "split-v", icon: string, title: string) => (
    <button key={l} type="button" onClick={() => onLayoutChange(l)} title={title}
      style={{ padding: "3px 8px", borderRadius: "4px", border: "none", background: layout === l ? "var(--accent)" : "transparent", color: layout === l ? "white" : "var(--muted)", fontSize: "14px", cursor: "pointer" }}>
      {icon}
    </button>
  );

  return (
    <header style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 16px", height: "40px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      <button onClick={onToggleSidebar} style={{ padding: "4px 8px", fontSize: "16px", border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer" }} title="Toggle sidebar">☰</button>
      <span style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text)" }}>ForgeOS</span>
      <div style={{ flex: 1 }} />

      {/* Layout toggle */}
      <div style={{ display: "flex", gap: "2px", background: "var(--bg)", borderRadius: "6px", padding: "3px" }}>
        {layoutBtn("single", "▪", "Single panel")}
        {layoutBtn("split-h", "⬜⬜", "Split horizontal")}
        {layoutBtn("split-v", "🟦", "Split vertical")}
      </div>

      {/* Orchestrator selector */}
      <div style={{ display: "flex", gap: "4px", background: "var(--bg)", borderRadius: "6px", padding: "3px" }}>
        {(["claude", "codex"] as const).map(o => (
          <button key={o} type="button" onClick={() => onOrchestratorChange(o)}
            style={{ padding: "3px 10px", borderRadius: "4px", border: "none", background: orchestrator === o ? "var(--accent)" : "transparent", color: orchestrator === o ? "white" : "var(--muted)", fontSize: "12px", cursor: "pointer", textTransform: "capitalize" }}>
            {o}
          </button>
        ))}
      </div>

      <UserMenu user={user} onOpenGlobalSettings={onOpenGlobalSettings} onOpenProjectSettings={onOpenProjectSettings} />
    </header>
  );
}
