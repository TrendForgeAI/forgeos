"use client";

import { useRouter } from "next/navigation";

interface User {
  name: string;
  role: string;
}

interface Props {
  user: User;
  orchestrator: "claude" | "codex";
  onOrchestratorChange: (o: "claude" | "codex") => void;
  onToggleSidebar: () => void;
}

export default function MenuBar({ user, orchestrator, onOrchestratorChange, onToggleSidebar }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "0 16px",
      height: "40px",
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      flexShrink: 0,
    }}>
      <button onClick={onToggleSidebar} className="btn-secondary"
        style={{ padding: "4px 8px", fontSize: "16px", border: "none", background: "transparent", color: "var(--muted)" }}
        title="Toggle sidebar">
        ☰
      </button>

      <span style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text)" }}>ForgeOS</span>

      <div style={{ flex: 1 }} />

      {/* Orchestrator selector */}
      <div style={{ display: "flex", gap: "4px", background: "var(--bg)", borderRadius: "6px", padding: "3px" }}>
        {(["claude", "codex"] as const).map(o => (
          <button key={o} type="button"
            onClick={() => onOrchestratorChange(o)}
            style={{
              padding: "3px 10px",
              borderRadius: "4px",
              border: "none",
              background: orchestrator === o ? "var(--accent)" : "transparent",
              color: orchestrator === o ? "white" : "var(--muted)",
              fontSize: "12px",
              cursor: "pointer",
              textTransform: "capitalize",
            }}>
            {o}
          </button>
        ))}
      </div>

      <span style={{ fontSize: "13px", color: "var(--muted)" }}>{user.name}</span>

      <button onClick={handleLogout} className="btn-secondary"
        style={{ padding: "4px 10px", fontSize: "12px" }}>
        Sign out
      </button>
    </header>
  );
}
