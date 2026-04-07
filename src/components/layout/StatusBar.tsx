"use client";

import { useEffect, useState } from "react";

interface Props {
  orchestrator: "claude" | "codex";
  activeProject: string | null;
}

export default function StatusBar({ orchestrator, activeProject }: Props) {
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProject) {
      setBranch(null);
      return;
    }

    let cancelled = false;

    async function fetchBranch() {
      try {
        const res = await fetch(
          `/api/git/branch?path=${encodeURIComponent(`/workspace/${activeProject}`)}`
        );
        if (res.ok && !cancelled) {
          const { branch: b } = await res.json();
          setBranch(b ?? null);
        }
      } catch {
        // network error — keep last known branch
      }
    }

    fetchBranch();
    const interval = setInterval(fetchBranch, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeProject]);

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

      {activeProject && (
        <span>{activeProject}</span>
      )}

      {branch && (
        <span style={{ color: "var(--muted)" }}>
          <span style={{ opacity: 0.5, marginRight: "4px" }}>⎇</span>
          {branch}
        </span>
      )}

      <span style={{ marginLeft: "auto" }}>ForgeOS v0.1.0</span>
    </footer>
  );
}
