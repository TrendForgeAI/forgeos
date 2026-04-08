"use client";

import { useRef, useEffect, useState } from "react";

interface Props {
  onClose: () => void;
  onCreated: (projectPath: string) => void;
}

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [mode, setMode] = useState<"init" | "clone">("init");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCloseRef.current(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Project name is required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), gitUrl: mode === "clone" ? gitUrl.trim() : undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create project"); return; }
      onCreated(`/workspace/${name.trim()}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: "6px",
    border: "1px solid var(--border)", background: "var(--bg)",
    color: "var(--text)", fontSize: "13px", boxSizing: "border-box",
  };

  const segBtn = (m: "init" | "clone", label: string) => (
    <button key={m} type="button" onClick={() => setMode(m)} style={{
      flex: 1, padding: "6px", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px",
      background: mode === m ? "var(--accent)" : "transparent",
      color: mode === m ? "white" : "var(--muted)",
    }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="new-project-title"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", width: "400px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="new-project-title" style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>New Project</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "18px" }} aria-label="Close">×</button>
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: "4px", background: "var(--bg)", borderRadius: "6px", padding: "3px" }}>
          {segBtn("init", "Empty repo")}
          {segBtn("clone", "Clone from URL")}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
              Project name <span style={{ color: "var(--muted)", fontWeight: 400 }}>(letters, digits, - _)</span>
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-project"
              style={inputStyle}
            />
          </div>

          {mode === "clone" && (
            <div>
              <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>Git URL</label>
              <input
                value={gitUrl}
                onChange={e => setGitUrl(e.target.value)}
                placeholder="https://github.com/org/repo.git"
                style={inputStyle}
              />
            </div>
          )}

          {error && (
            <p style={{ fontSize: "12px", color: "#f87171", margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
            <button type="button" onClick={onClose} style={{ padding: "7px 16px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: "13px" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: "7px 16px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "white", cursor: loading ? "default" : "pointer", fontSize: "13px", opacity: loading ? 0.7 : 1 }}>
              {loading ? (mode === "clone" ? "Cloning…" : "Creating…") : (mode === "clone" ? "Clone" : "Create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
