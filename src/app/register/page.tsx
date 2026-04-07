"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    fetch(`/api/register?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.email) {
          setEmail(j.email);
          setTokenValid(true);
        } else {
          setTokenValid(false);
        }
      })
      .catch(() => setTokenValid(false));
  }, [token]);

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
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Registration failed");
      router.push("/login?registered=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (tokenValid === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--muted)" }}>Validating invite…</p>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--danger)", marginBottom: "16px" }}>This invite link is invalid or has expired.</p>
          <a href="/login" style={{ color: "var(--accent)", fontSize: "14px" }}>Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "6px" }}>Create Account</h1>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>You were invited to ForgeOS</p>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "32px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", color: "var(--muted)" }}>Email</label>
              <input value={email} disabled style={{ opacity: 0.6 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", color: "var(--muted)" }}>Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" required autoFocus />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", color: "var(--muted)" }}>Password (min 12 chars)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", color: "var(--muted)" }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••••••" required />
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px" }}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
