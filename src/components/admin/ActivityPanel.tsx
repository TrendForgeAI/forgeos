"use client";

import { useEffect, useState } from "react";

interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: "Logged in",
  commit: "Committed",
  push: "Pushed",
  file_write: "Wrote file",
  project_create: "Created project",
  project_delete: "Deleted project",
};

const ACTION_COLORS: Record<string, string> = {
  login: "var(--accent)",
  commit: "#22c55e",
  push: "#3b82f6",
  file_write: "var(--muted)",
  project_create: "#a78bfa",
  project_delete: "#f87171",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ActivityPanel() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity")
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ fontSize: "13px", color: "var(--muted)" }}>Loading…</p>;
  if (entries.length === 0) return <p style={{ fontSize: "13px", color: "var(--muted)" }}>No activity yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {entries.map(e => (
        <div key={e.id} style={{
          display: "grid", gridTemplateColumns: "auto 1fr auto",
          gap: "10px", alignItems: "start",
          padding: "8px 10px", borderRadius: "6px",
          background: "var(--bg)", border: "1px solid var(--border)",
        }}>
          <span style={{
            fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px",
            background: ACTION_COLORS[e.action] + "22",
            color: ACTION_COLORS[e.action],
            whiteSpace: "nowrap", marginTop: "1px",
          }}>
            {ACTION_LABELS[e.action] ?? e.action}
          </span>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>{e.userName}</span>
            {e.target && (
              <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", maxWidth: "260px", verticalAlign: "middle" }}>
                {e.target}
              </span>
            )}
          </div>
          <span style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap" }}>
            {timeAgo(e.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
