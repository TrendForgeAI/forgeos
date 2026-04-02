"use client";

import { useState, useEffect, useCallback } from "react";
import FileTree from "./FileTree";
import CommitOverlay from "./CommitOverlay";
import Toast from "./Toast";

interface Project {
  id: string;
  name: string;
  path: string;
}

interface TreeItem {
  name: string;
  path: string;
  type: "file" | "dir";
}

interface GitChange {
  status: string;
  path: string;
}

interface Props {
  activeProject: string | null;
  onSelectProject: (path: string) => void;
  onOpenFile?: (path: string) => void;
}

export default function Sidebar({ activeProject, onSelectProject, onOpenFile }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rootItems, setRootItems] = useState<TreeItem[]>([]);
  const [gitChanges, setGitChanges] = useState<GitChange[]>([]);
  const [showCommit, setShowCommit] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const repoPath = activeProject ?? "/app";

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {});
  }, []);

  const loadRootItems = useCallback(async () => {
    const res = await fetch(`/api/files?path=${encodeURIComponent(repoPath)}`);
    const json = await res.json();
    setRootItems(json.items ?? []);
  }, [repoPath]);

  const loadGitStatus = useCallback(async () => {
    const res = await fetch(`/api/git/status?path=${encodeURIComponent(repoPath)}`);
    const json = await res.json();
    setGitChanges(json.changes ?? []);
  }, [repoPath]);

  useEffect(() => {
    loadRootItems();
    loadGitStatus();
  }, [loadRootItems, loadGitStatus]);

  async function handlePush() {
    setPushing(true);
    try {
      const res = await fetch("/api/git/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repoPath }),
      });
      const json = await res.json();
      if (res.ok) setToast({ message: "Pushed successfully", type: "success" });
      else setToast({ message: json.error ?? "Push failed", type: "error" });
    } catch {
      setToast({ message: "Push failed", type: "error" });
    } finally {
      setPushing(false);
    }
  }

  const sectionLabel: React.CSSProperties = {
    padding: "8px 12px 4px",
    fontSize: "11px", fontWeight: 600, color: "var(--muted)",
    textTransform: "uppercase", letterSpacing: "0.08em",
  };

  return (
    <aside style={{ width: "220px", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
      {/* Projects list */}
      <div style={sectionLabel}>Projects</div>
      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
        {/* ForgeOS root */}
        <button onClick={() => onSelectProject("/app")} style={{
          display: "flex", alignItems: "center", gap: "6px", width: "100%", textAlign: "left",
          padding: "6px 12px", border: "none", borderRadius: "4px",
          background: repoPath === "/app" ? "rgba(59,130,246,0.15)" : "transparent",
          color: repoPath === "/app" ? "var(--accent)" : "var(--text)", fontSize: "12px", fontWeight: 600, cursor: "pointer",
        }}>
          <span style={{ fontSize: "11px" }}>⬡</span> ForgeOS
        </button>
        {projects.map(p => (
          <button key={p.id} onClick={() => onSelectProject(p.path)} style={{
            display: "flex", alignItems: "center", gap: "6px", width: "100%", textAlign: "left",
            padding: "6px 12px 6px 20px", border: "none", borderRadius: "4px",
            background: activeProject === p.path ? "rgba(59,130,246,0.15)" : "transparent",
            color: activeProject === p.path ? "var(--accent)" : "var(--text)", fontSize: "12px", cursor: "pointer",
          }}>
            <span style={{ fontSize: "11px" }}>📁</span> {p.name}
          </button>
        ))}
      </div>

      {/* File tree */}
      <div style={{ flex: 1, overflow: "auto", paddingTop: "4px" }}>
        <FileTree
          items={rootItems}
          basePath={repoPath}
          gitChanges={gitChanges}
          onFileClick={(path) => onOpenFile?.(path)}
          onRefresh={() => { loadRootItems(); loadGitStatus(); }}
        />
      </div>

      {/* Git actions — only shown when there are changes */}
      {gitChanges.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "8px 10px", display: "flex", gap: "6px" }}>
          <button onClick={() => setShowCommit(true)} className="btn-primary" style={{ flex: 1, fontSize: "12px", padding: "6px" }}>
            Commit ({gitChanges.length})
          </button>
          <button onClick={handlePush} className="btn-secondary" style={{ flex: 1, fontSize: "12px", padding: "6px" }} disabled={pushing}>
            {pushing ? "…" : "Push"}
          </button>
        </div>
      )}

      {showCommit && (
        <CommitOverlay
          repoPath={repoPath}
          changes={gitChanges}
          onClose={() => setShowCommit(false)}
          onCommitted={() => { setShowCommit(false); loadGitStatus(); setToast({ message: "Committed successfully", type: "success" }); }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </aside>
  );
}
