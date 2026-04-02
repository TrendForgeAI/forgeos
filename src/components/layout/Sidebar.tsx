"use client";

import { useState, useEffect } from "react";

interface Project {
  id: string;
  name: string;
  path: string;
}

interface Props {
  activeProject: string | null;
  onSelectProject: (name: string) => void;
}

export default function Sidebar({ activeProject, onSelectProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => setProjects(data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <aside style={{
      width: "220px",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Projects
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "4px" }}>
        {loading && <p style={{ padding: "8px 12px", color: "var(--muted)", fontSize: "12px" }}>Loading…</p>}
        {!loading && projects.length === 0 && (
          <p style={{ padding: "8px 12px", color: "var(--muted)", fontSize: "12px" }}>No projects in /workspace</p>
        )}
        {projects.map(p => (
          <button key={p.id} type="button"
            onClick={() => onSelectProject(p.name)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              background: activeProject === p.name ? "rgba(59,130,246,0.15)" : "transparent",
              color: activeProject === p.name ? "var(--accent)" : "var(--text)",
              fontSize: "13px",
              cursor: "pointer",
            }}>
            {p.name}
          </button>
        ))}
      </div>
    </aside>
  );
}
