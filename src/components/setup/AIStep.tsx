"use client";

import { useState } from "react";

interface AIData {
  claude: { method: string; value: string } | null;
  codex: { apiKey: string } | null;
}

interface Props {
  onComplete: (data: AIData) => void;
}

export default function AIStep({ onComplete }: Props) {
  const [claudeMethod, setClaudeMethod] = useState<"api_key" | "skip">("api_key");
  const [claudeKey, setClaudeKey] = useState("");
  const [codexKey, setCodexKey] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [error, setError] = useState("");

  async function testClaudeKey() {
    if (!claudeKey) return;
    setTestStatus("testing");
    setError("");
    try {
      const res = await fetch("/api/setup/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: claudeKey }),
      });
      const json = await res.json();
      setTestStatus(json.valid ? "ok" : "fail");
      if (!json.valid) setError(json.error || "Invalid API key");
    } catch {
      setTestStatus("fail");
      setError("Connection failed");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const claude = claudeMethod === "api_key" && claudeKey
      ? { method: "api_key", value: claudeKey }
      : null;
    const codex = codexKey ? { apiKey: codexKey } : null;
    onComplete({ claude, codex });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>AI Providers</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Configure Claude and/or Codex. Both are optional and can be set later.</p>
      </div>

      {/* Claude */}
      <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Claude (Anthropic)</h3>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {(["api_key", "skip"] as const).map(m => (
            <button key={m} type="button"
              onClick={() => setClaudeMethod(m)}
              style={{
                padding: "6px 12px", borderRadius: "6px", border: "1px solid",
                borderColor: claudeMethod === m ? "var(--accent)" : "var(--border)",
                background: claudeMethod === m ? "rgba(59,130,246,0.1)" : "transparent",
                color: "var(--text)", cursor: "pointer", fontSize: "13px",
              }}>
              {m === "api_key" ? "API Key" : "Skip"}
            </button>
          ))}
        </div>

        {claudeMethod === "api_key" && (
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={claudeKey}
              onChange={e => { setClaudeKey(e.target.value); setTestStatus("idle"); }}
              placeholder="sk-ant-..."
              type="password"
            />
            <button type="button" onClick={testClaudeKey} className="btn-secondary"
              style={{ whiteSpace: "nowrap", width: "auto" }}
              disabled={!claudeKey || testStatus === "testing"}>
              {testStatus === "testing" ? "…" : testStatus === "ok" ? "✓" : "Test"}
            </button>
          </div>
        )}
        {testStatus === "ok" && <p style={{ color: "var(--success)", fontSize: "12px", marginTop: "6px" }}>API key valid</p>}
        {testStatus === "fail" && <p style={{ color: "var(--danger)", fontSize: "12px", marginTop: "6px" }}>{error}</p>}
      </div>

      {/* Codex */}
      <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Codex (OpenAI)</h3>
        <input
          value={codexKey}
          onChange={e => setCodexKey(e.target.value)}
          placeholder="sk-... (optional)"
          type="password"
        />
      </div>

      <button type="submit" className="btn-primary" style={{ marginTop: "8px" }}>
        Continue →
      </button>
    </form>
  );
}
