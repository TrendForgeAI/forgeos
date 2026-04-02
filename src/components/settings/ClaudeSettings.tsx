"use client";

import { useState } from "react";

type ClaudeMethod = "api_key" | "oauth" | "skip";

interface Props {
  showSaveButton?: boolean;
  onSave?: (data: { method: ClaudeMethod; value?: string } | null) => void;
}

export default function ClaudeSettings({ showSaveButton, onSave }: Props) {
  const [method, setMethod] = useState<ClaudeMethod>("api_key");
  const [apiKey, setApiKey] = useState("");
  const [oauthUrl, setOauthUrl] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [oauthDone, setOauthDone] = useState(false);
  const [error, setError] = useState("");

  async function testKey() {
    if (!apiKey) return;
    setTestStatus("testing");
    setError("");
    try {
      const res = await fetch("/api/setup/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const json = await res.json();
      setTestStatus(json.valid ? "ok" : "fail");
      if (!json.valid) setError(json.error || "Invalid API key");
    } catch {
      setTestStatus("fail");
      setError("Connection failed");
    }
  }

  async function startOAuth() {
    setError("");
    try {
      const res = await fetch("/api/setup/claude-oauth", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setOauthUrl(json.url);
      pollOAuth();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth");
    }
  }

  async function pollOAuth() {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch("/api/setup/claude-oauth");
        const json = await res.json();
        if (json.authenticated) { setOauthDone(true); return; }
      } catch { /* continue */ }
    }
    setError("OAuth timed out. Try again.");
  }

  const sectionStyle: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" };

  const methodBtn = (m: ClaudeMethod, label: string) => (
    <button key={m} type="button" onClick={() => setMethod(m)} style={{
      padding: "6px 12px", borderRadius: "6px", border: "1px solid",
      borderColor: method === m ? "var(--accent)" : "var(--border)",
      background: method === m ? "rgba(59,130,246,0.1)" : "transparent",
      color: "var(--text)", cursor: "pointer", fontSize: "13px",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        {methodBtn("api_key", "API Key")}
        {methodBtn("oauth", "claude.ai Login")}
        {methodBtn("skip", "Skip")}
      </div>

      {method === "api_key" && (
        <div style={sectionStyle}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setTestStatus("idle"); }}
              placeholder="sk-ant-..."
              type="password"
            />
            <button
              type="button"
              onClick={testKey}
              className="btn-secondary"
              style={{ whiteSpace: "nowrap", width: "auto" }}
              disabled={!apiKey || testStatus === "testing"}
            >
              {testStatus === "testing" ? "…" : testStatus === "ok" ? "✓" : "Test"}
            </button>
          </div>
          {testStatus === "ok" && <p style={{ color: "var(--success)", fontSize: "12px", marginTop: "6px" }}>API key valid</p>}
          {testStatus === "fail" && <p style={{ color: "var(--danger)", fontSize: "12px", marginTop: "6px" }}>{error}</p>}
        </div>
      )}

      {method === "oauth" && (
        <div style={sectionStyle}>
          {!oauthUrl && !oauthDone && (
            <button type="button" onClick={startOAuth} className="btn-secondary" style={{ width: "100%" }}>
              Open claude.ai Login
            </button>
          )}
          {oauthUrl && !oauthDone && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>Open this URL in your browser:</p>
              <a href={oauthUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: "12px", color: "var(--accent)", wordBreak: "break-all" }}>
                {oauthUrl}
              </a>
              <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>Waiting for authorization…</p>
            </div>
          )}
          {oauthDone && <p style={{ color: "var(--success)", fontSize: "13px" }}>✓ claude.ai connected</p>}
          {error && <p style={{ color: "var(--danger)", fontSize: "13px", marginTop: "8px" }}>{error}</p>}
        </div>
      )}

      {method === "skip" && (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          Claude will not be configured. You can set this up later in Settings.
        </p>
      )}

      {showSaveButton && method !== "skip" && (
        <button type="button" onClick={() => {
          if (method === "api_key" && apiKey) onSave?.({ method: "api_key", value: apiKey });
          else if (method === "oauth" && oauthDone) onSave?.({ method: "oauth" });
        }} className="btn-primary">
          Save Claude Settings
        </button>
      )}
    </div>
  );
}
