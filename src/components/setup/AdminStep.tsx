"use client";

import { useState } from "react";

interface Props {
  onComplete: (data: { email: string; password: string; name: string }) => void;
}

export default function AdminStep({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      onComplete({ name, email, password });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create admin account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>Admin Account</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Create the primary administrator account.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "13px", color: "var(--muted)" }}>Full Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" required />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "13px", color: "var(--muted)" }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "13px", color: "var(--muted)" }}>Password (min 12 chars)</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" required />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "13px", color: "var(--muted)" }}>Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••••••" required />
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}

      <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px" }}>
        {loading ? "Creating account…" : "Create Admin Account →"}
      </button>
    </form>
  );
}
