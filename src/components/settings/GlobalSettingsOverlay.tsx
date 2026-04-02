"use client";

import { useEffect, useRef, useState } from "react";
import GitSettings from "./GitSettings";
import ClaudeSettings from "./ClaudeSettings";
import CodexSettings from "./CodexSettings";

interface Props {
  onClose: () => void;
}

type Tab = "git" | "claude" | "codex";

export default function GlobalSettingsOverlay({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("git");
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCloseRef.current(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const tabBtn = (t: Tab, label: string) => (
    <button key={t} type="button" onClick={() => setTab(t)} style={{
      padding: "8px 16px", borderBottom: "2px solid",
      borderColor: tab === t ? "var(--accent)" : "transparent",
      background: "transparent", color: tab === t ? "var(--accent)" : "var(--muted)",
      cursor: "pointer", fontSize: "13px", fontWeight: tab === t ? 600 : 400,
    }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="global-settings-title" tabIndex={-1} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", width: "560px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 id="global-settings-title" style={{ fontSize: "16px", fontWeight: "600" }}>Global Settings</h2>
          <button aria-label="Close" onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {tabBtn("git", "Git")}
          {tabBtn("claude", "Claude")}
          {tabBtn("codex", "Codex")}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
          {tab === "git" && <GitSettings showSaveButton onSave={() => onClose()} />}
          {tab === "claude" && <ClaudeSettings showSaveButton onSave={() => onClose()} />}
          {tab === "codex" && <CodexSettings showSaveButton onSave={() => onClose()} />}
        </div>
      </div>
    </div>
  );
}
