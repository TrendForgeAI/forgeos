"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Project {
  id: string;
  name: string;
  path: string;
  repoUrl: string | null;
}

interface Props {
  activeProject: string | null;
  onClose: () => void;
}

export default function ProjectSettingsOverlay({ activeProject, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [project, setProject] = useState<Project | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => { dialogRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCloseRef.current(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const load = useCallback(async () => {
    if (!activeProject || activeProject === "/app") return;
    try {
      // Find project by path
      const res = await fetch("/api/projects");
      if (res.ok) {
        const json = await res.json();
        const found = (json.projects as Project[]).find(p => p.path === activeProject);
        if (found) {
          setProject(found);
          setRemoteUrl(found.repoUrl ?? "");
        }
      }
      // Load branch
      const bRes = await fetch(`/api/git/branch?path=${encodeURIComponent(activeProject)}`);
      if (bRes.ok) {
        const bJson = await bRes.json();
        setBranch(bJson.branch ?? null);
      }
    } catch { /* ignore */ }
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remoteUrl: remoteUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save"); return; }
      setProject(json.project);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: "6px",
    border: "1px solid var(--border)", background: "var(--bg)",
    color: "var(--text)", fontSize: "13px", boxSizing: "border-box",
  };

  const isForgeOS = !activeProject || activeProject === "/app";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="project-settings-title" tabIndex={-1}
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", width: "480px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 id="project-settings-title" style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Project Settings</h2>
          <button aria-label="Close" onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {isForgeOS ? (
            <>
              <InfoRow label="Project" value="ForgeOS (root)" />
              <InfoRow label="Path" value="/app" />
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                ForgeOS root project settings are managed via Global Settings.
              </p>
            </>
          ) : project ? (
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <InfoRow label="Name" value={project.name} />
              <InfoRow label="Path" value={project.path} />
              {branch && <InfoRow label="Branch" value={branch} />}

              <div>
                <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>Remote URL</label>
                <input
                  value={remoteUrl}
                  onChange={e => setRemoteUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  style={inputStyle}
                />
                <p style={{ fontSize: "11px", color: "var(--muted)", margin: "4px 0 0" }}>
                  Sets or updates <code>git remote origin</code>
                </p>
              </div>

              {error && <p style={{ fontSize: "12px", color: "#f87171", margin: 0 }}>{error}</p>}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={saving} style={{
                  padding: "7px 20px", borderRadius: "6px", border: "none",
                  background: saved ? "#22c55e" : "var(--accent)", color: "white",
                  cursor: saving ? "default" : "pointer", fontSize: "13px", opacity: saving ? 0.7 : 1,
                }}>
                  {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          ) : (
            <p style={{ fontSize: "13px", color: "var(--muted)" }}>
              {activeProject ? "Loading project info…" : "No project selected."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ fontSize: "13px", color: "var(--text)", margin: 0, fontFamily: "monospace", wordBreak: "break-all" }}>{value}</p>
    </div>
  );
}
