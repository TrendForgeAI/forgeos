"use client";

import { useState, useEffect, useCallback } from "react";
import FileTree from "./FileTree";
import CommitOverlay from "./CommitOverlay";
import Toast from "./Toast";
import NewProjectModal from "./NewProjectModal";

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
  currentUserRole?: string;
}

export default function Sidebar({ activeProject, onSelectProject, onOpenFile, currentUserRole }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rootItems, setRootItems] = useState<TreeItem[]>([]);
  const [gitChanges, setGitChanges] = useState<GitChange[]>([]);
  const [showCommit, setShowCommit] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Record<string, string>>({});

  const repoPath = activeProject ?? "/app";
  const isAdmin = currentUserRole === "admin";

  const loadProjects = useCallback(() => {
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {});
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const loadRootItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(repoPath)}`);
      const json = await res.json();
      if (!res.ok) { setRootItems([]); return; }
      setRootItems(json.items ?? []);
    } catch {
      setRootItems([]);
    }
  }, [repoPath]);

  const loadGitStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/git/status?path=${encodeURIComponent(repoPath)}`);
      const json = await res.json();
      setGitChanges(json.changes ?? []);
    } catch {
      setGitChanges([]);
    }
  }, [repoPath]);

  useEffect(() => {
    loadRootItems();
    loadGitStatus();
  }, [loadRootItems, loadGitStatus]);

  // Load branch for each project
  useEffect(() => {
    projects.forEach(async (p) => {
      try {
        const res = await fetch(`/api/git/branch?path=${encodeURIComponent(p.path)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.branch) {
            setBranches(prev => ({ ...prev, [p.path]: json.branch }));
          }
        }
      } catch { /* ignore */ }
    });
  }, [projects]);

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

  async function handleDeleteProject(project: Project) {
    if (!confirm(`Delete project "${project.name}"? This will permanently remove /workspace/${project.name}.`)) return;
    setDeletingId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        setToast({ message: `Deleted "${project.name}"`, type: "success" });
        if (activeProject === project.path) onSelectProject("/app");
        loadProjects();
      } else {
        setToast({ message: json.error ?? "Delete failed", type: "error" });
      }
    } catch {
      setToast({ message: "Delete failed", type: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  const sectionLabel: React.CSSProperties = {
    padding: "8px 12px 4px",
    fontSize: "11px", fontWeight: 600, color: "var(--muted)",
    textTransform: "uppercase", letterSpacing: "0.08em",
  };

  return (
    <aside style={{ width: "220px", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
      {/* Projects header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "8px" }}>
        <div style={sectionLabel}>Projects</div>
        <button
          onClick={() => setShowNewProject(true)}
          title="New project"
          style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "2px 4px", borderRadius: "4px" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
        >+</button>
      </div>

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

        {projects.map(p => {
          const branch = branches[p.path];
          const isDeleting = deletingId === p.id;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", paddingRight: "4px" }}>
              <button onClick={() => onSelectProject(p.path)} style={{
                flex: 1, display: "flex", alignItems: "center", gap: "6px", textAlign: "left",
                padding: "6px 4px 6px 20px", border: "none", borderRadius: "4px",
                background: activeProject === p.path ? "rgba(59,130,246,0.15)" : "transparent",
                color: activeProject === p.path ? "var(--accent)" : "var(--text)", fontSize: "12px", cursor: "pointer",
                minWidth: 0,
              }}>
                <span style={{ fontSize: "11px", flexShrink: 0 }}>📁</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                {branch && (
                  <span style={{ fontSize: "10px", color: "var(--muted)", flexShrink: 0, marginLeft: "auto", paddingRight: "4px" }}>
                    {branch.length > 10 ? branch.slice(0, 10) + "…" : branch}
                  </span>
                )}
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteProject(p)}
                  disabled={isDeleting}
                  title={`Delete ${p.name}`}
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: isDeleting ? "default" : "pointer", fontSize: "12px", padding: "2px 4px", borderRadius: "3px", flexShrink: 0, opacity: isDeleting ? 0.4 : 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
                >×</button>
              )}
            </div>
          );
        })}
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

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(path) => {
            setShowNewProject(false);
            loadProjects();
            onSelectProject(path);
            setToast({ message: "Project created", type: "success" });
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </aside>
  );
}
