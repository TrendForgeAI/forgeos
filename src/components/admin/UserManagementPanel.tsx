"use client";

import { useEffect, useState } from "react";
import InvitePanel from "./InvitePanel";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

const ROLES = ["admin", "developer", "viewer", "guest"] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  developer: "Developer",
  viewer: "Viewer",
  guest: "Guest",
};

const ROLE_COLOR: Record<string, string> = {
  admin: "var(--accent)",
  developer: "var(--success, #22c55e)",
  viewer: "var(--muted)",
  guest: "var(--muted)",
};

interface Props {
  currentUserId: string;
}

export default function UserManagementPanel({ currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const j = await res.json();
        setUsers(j.users);
      }
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function changeRole(id: string, role: string) {
    setUpdating(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to update role"); return; }
      await load();
    } finally {
      setUpdating(null);
    }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Remove user "${name}"? This cannot be undone.`)) return;
    setUpdating(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Failed to delete user"); return; }
      await load();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* User list */}
      <div>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Users ({users.length})
        </p>

        {error && (
          <p style={{ color: "var(--danger, #ef4444)", fontSize: "13px", marginBottom: "12px" }}>{error}</p>
        )}

        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>Loading…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const isUpdating = updating === u.id;

              return (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px", opacity: isUpdating ? 0.6 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.name}
                      {isSelf && <span style={{ marginLeft: "6px", fontSize: "11px", color: "var(--muted)" }}>(you)</span>}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                  </div>

                  <span style={{ fontSize: "11px", fontWeight: 600, color: ROLE_COLOR[u.role] ?? "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", minWidth: "64px", textAlign: "right" }}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>

                  <select
                    value={u.role}
                    disabled={isSelf || isUpdating}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    style={{ fontSize: "12px", padding: "3px 6px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text)", cursor: isSelf ? "not-allowed" : "pointer" }}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={isSelf || isUpdating}
                    onClick={() => deleteUser(u.id, u.name)}
                    style={{ background: "none", border: "none", color: isSelf ? "var(--muted)" : "var(--danger, #ef4444)", cursor: isSelf ? "not-allowed" : "pointer", fontSize: "13px", padding: "4px 8px", flexShrink: 0 }}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite section */}
      <div>
        <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Invite
        </p>
        <InvitePanel />
      </div>
    </div>
  );
}
