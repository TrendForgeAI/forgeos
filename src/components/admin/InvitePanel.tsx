"use client";

import { useEffect, useState } from "react";

interface Invite {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  invitedBy: { name: string; email: string };
}

export default function InvitePanel() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/invites");
    if (res.ok) {
      const j = await res.json();
      setInvites(j.invites);
    }
  }

  useEffect(() => { load(); }, []);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setEmail("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
    await load();
  }

  function copyLink(token: string, id: string) {
    const url = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const active = invites.filter((i) => !i.usedAt && new Date(i.expiresAt) > new Date());
  const past = invites.filter((i) => i.usedAt || new Date(i.expiresAt) <= new Date());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Create invite */}
      <form onSubmit={createInvite} style={{ display: "flex", gap: "8px" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" style={{ width: "auto", whiteSpace: "nowrap" }} disabled={creating}>
          {creating ? "…" : "Send Invite"}
        </button>
      </form>
      {error && <p style={{ color: "var(--danger)", fontSize: "13px", marginTop: "-16px" }}>{error}</p>}

      {/* Active invites */}
      {active.length > 0 && (
        <div>
          <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {active.map((inv) => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }}>
                <span style={{ flex: 1 }}>{inv.email}</span>
                <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                  expires {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  onClick={() => copyLink(inv.token, inv.id)}
                  className="btn-secondary"
                  style={{ width: "auto", padding: "4px 10px", fontSize: "12px" }}>
                  {copiedId === inv.id ? "Copied!" : "Copy Link"}
                </button>
                <button
                  type="button"
                  onClick={() => revokeInvite(inv.id)}
                  style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "13px", padding: "4px 8px" }}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past invites */}
      {past.length > 0 && (
        <div>
          <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Used / Expired</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {past.map((inv) => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px", opacity: 0.6 }}>
                <span style={{ flex: 1 }}>{inv.email}</span>
                <span style={{ fontSize: "12px", color: inv.usedAt ? "var(--success)" : "var(--danger)" }}>
                  {inv.usedAt ? `Used ${new Date(inv.usedAt).toLocaleDateString()}` : "Expired"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {invites.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center" }}>No invites yet. Enter an email above to invite a user.</p>
      )}
    </div>
  );
}
