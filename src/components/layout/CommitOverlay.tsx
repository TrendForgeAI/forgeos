"use client";

import { useEffect, useState } from "react";

interface Change {
  status: string;
  path: string;
}

interface Props {
  repoPath: string;
  changes: Change[];
  onClose: () => void;
  onCommitted: () => void;
}

export default function CommitOverlay({ repoPath, changes, onClose, onCommitted }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(changes.map(c => c.path)));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleFile(path: string) {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function handleCommit() {
    if (!message.trim()) { setError("Commit message required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repoPath, message: message.trim(), files: [...selected] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onCommitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setLoading(false);
    }
  }

  const statusColor = (s: string) => s.startsWith("M") ? "var(--warning)" : s.startsWith("D") ? "var(--danger)" : "var(--success)";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", width: "480px", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600" }}>Commit Changes</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          <div style={{ marginBottom: "12px" }}>
            {changes.map(c => (
              <label key={c.path} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer", fontSize: "13px" }}>
                <input type="checkbox" checked={selected.has(c.path)} onChange={() => toggleFile(c.path)} />
                <span style={{ color: statusColor(c.status), fontWeight: 600, width: "16px" }}>{c.status}</span>
                <span style={{ color: "var(--text)", fontFamily: "monospace", fontSize: "12px" }}>{c.path}</span>
              </label>
            ))}
          </div>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Commit message…"
            style={{ width: "100%", height: "80px", resize: "vertical", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "var(--text)", fontSize: "13px" }}
          />
          {error && <p style={{ color: "var(--danger)", fontSize: "13px", marginTop: "8px" }}>{error}</p>}
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleCommit} className="btn-primary" disabled={loading || selected.size === 0}>
            {loading ? "Committing…" : `Commit ${selected.size} file${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
