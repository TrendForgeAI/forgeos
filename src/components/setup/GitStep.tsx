"use client";

import { useState } from "react";

interface Props {
  onComplete: (data: { name: string; email: string; githubAuth: boolean }) => void;
}

type GitHubState = "idle" | "polling" | "done" | "error";

export default function GitStep({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ghState, setGhState] = useState<GitHubState>("idle");
  const [deviceCode, setDeviceCode] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [error, setError] = useState("");

  async function startGitHubAuth() {
    setError("");
    setGhState("polling");
    try {
      const res = await fetch("/api/setup/github", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setDeviceCode({ userCode: json.userCode, verificationUri: json.verificationUri });
      pollForGitHubAuth(json.deviceCode, json.interval || 5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "GitHub auth failed");
      setGhState("error");
    }
  }

  async function pollForGitHubAuth(deviceCode: string, interval: number) {
    const maxAttempts = 24; // 2 minutes
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, interval * 1000));
      try {
        const res = await fetch("/api/setup/github", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode }),
        });
        const json = await res.json();
        if (json.authenticated) {
          setGhState("done");
          return;
        }
      } catch {
        // continue polling
      }
    }
    setError("GitHub auth timed out. Try again.");
    setGhState("error");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onComplete({ name, email, githubAuth: ghState === "done" });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>Git Identity</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Your name and email for commits. GitHub auth is optional.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "13px", color: "var(--muted)" }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" required />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "13px", color: "var(--muted)" }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
      </div>

      {/* GitHub Device Flow */}
      <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "500" }}>GitHub Authentication</span>
          {ghState === "done" && <span style={{ color: "var(--success)", fontSize: "13px" }}>✓ Connected</span>}
        </div>

        {ghState === "idle" && (
          <button type="button" onClick={startGitHubAuth} className="btn-secondary" style={{ width: "100%" }}>
            Connect GitHub (Device Flow)
          </button>
        )}

        {ghState === "polling" && deviceCode && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>
              Open <a href={deviceCode.verificationUri} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{deviceCode.verificationUri}</a> and enter:
            </p>
            <div style={{ fontSize: "24px", fontWeight: "bold", letterSpacing: "0.2em", padding: "12px", background: "var(--bg)", borderRadius: "6px" }}>
              {deviceCode.userCode}
            </div>
            <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>Waiting for authorization…</p>
          </div>
        )}

        {ghState === "error" && (
          <div>
            <p style={{ color: "var(--danger)", fontSize: "13px", marginBottom: "8px" }}>{error}</p>
            <button type="button" onClick={startGitHubAuth} className="btn-secondary" style={{ width: "100%" }}>Retry</button>
          </div>
        )}
      </div>

      <button type="submit" className="btn-primary" style={{ marginTop: "8px" }}>
        Continue →
      </button>
    </form>
  );
}
