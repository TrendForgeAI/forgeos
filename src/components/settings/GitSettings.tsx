"use client";

import { useState, useRef, useEffect } from "react";

type GitMethod = "device_flow" | "pat" | "ssh";

interface Props {
  defaultMethod?: GitMethod;
  onSave?: (data: { method: GitMethod; value?: string; githubAuth?: boolean }) => void;
  showSaveButton?: boolean;
}

type GHState = "idle" | "polling" | "done" | "error";

export default function GitSettings({ defaultMethod = "device_flow", onSave, showSaveButton }: Props) {
  const cancelPollRef = useRef(false);
  const [method, setMethod] = useState<GitMethod>(defaultMethod);
  const [pat, setPat] = useState("");
  const [sshPubKey, setSshPubKey] = useState("");
  const [ghState, setGhState] = useState<GHState>("idle");
  const [deviceCode, setDeviceCode] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateSSHKey() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup/ssh-key", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSshPubKey(json.publicKey);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

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

  useEffect(() => {
    return () => { cancelPollRef.current = true; };
  }, []);

  async function pollForGitHubAuth(code: string, interval: number) {
    cancelPollRef.current = false;
    for (let i = 0; i < 24; i++) {
      if (cancelPollRef.current) return;
      await new Promise(r => setTimeout(r, interval * 1000));
      if (cancelPollRef.current) return;
      try {
        const res = await fetch("/api/setup/github", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: code }),
        });
        const json = await res.json();
        if (json.authenticated) {
          setGhState("done");
          if (!showSaveButton) onSave?.({ method: "device_flow", githubAuth: true });
          return;
        }
      } catch { /* continue */ }
    }
    setError("GitHub auth timed out. Try again.");
    setGhState("error");
  }

  async function handleSave() {
    if (method === "pat") {
      if (!pat) { setError("PAT required"); return; }
      const res = await fetch("/api/setup/github", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pat }),
      });
      if (res.ok) onSave?.({ method: "pat", value: pat });
      else setError("Failed to save PAT");
    } else if (method === "ssh") {
      onSave?.({ method: "ssh", value: sshPubKey });
    } else {
      onSave?.({ method: "device_flow", githubAuth: ghState === "done" });
    }
  }

  const sectionStyle: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" };

  const methodBtn = (m: GitMethod, label: string) => (
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
        {methodBtn("device_flow", "GitHub Device Flow")}
        {methodBtn("pat", "Personal Access Token")}
        {methodBtn("ssh", "SSH Key")}
      </div>

      {method === "device_flow" && (
        <div style={sectionStyle}>
          {ghState === "idle" && (
            <button type="button" onClick={startGitHubAuth} className="btn-secondary" style={{ width: "100%" }}>
              Connect GitHub
            </button>
          )}
          {ghState === "polling" && deviceCode && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>
                Open{" "}
                <a href={deviceCode.verificationUri} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                  {deviceCode.verificationUri}
                </a>{" "}
                and enter:
              </p>
              <div style={{ fontSize: "24px", fontWeight: "bold", letterSpacing: "0.2em", padding: "12px", background: "var(--bg)", borderRadius: "6px" }}>
                {deviceCode.userCode}
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>Waiting for authorization…</p>
            </div>
          )}
          {ghState === "done" && <p style={{ color: "var(--success)", fontSize: "13px" }}>✓ GitHub connected</p>}
          {ghState === "error" && (
            <div>
              <p style={{ color: "var(--danger)", fontSize: "13px", marginBottom: "8px" }}>{error}</p>
              <button type="button" onClick={startGitHubAuth} className="btn-secondary" style={{ width: "100%" }}>Retry</button>
            </div>
          )}
        </div>
      )}

      {method === "pat" && (
        <div style={sectionStyle}>
          <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>Personal Access Token</label>
          <input type="password" value={pat} onChange={e => setPat(e.target.value)} placeholder="ghp_..." style={{ width: "100%" }} />
          <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>Requires: repo, read:org, user:email scopes</p>
        </div>
      )}

      {method === "ssh" && (
        <div style={sectionStyle}>
          {!sshPubKey ? (
            <button type="button" onClick={generateSSHKey} className="btn-secondary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Generating…" : "Generate SSH Key"}
            </button>
          ) : (
            <div>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>
                Add this public key to GitHub/GitLab → Settings → SSH Keys:
              </p>
              <textarea
                readOnly
                value={sshPubKey}
                style={{ width: "100%", height: "80px", fontSize: "11px", fontFamily: "monospace", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", padding: "8px", resize: "none", color: "var(--text)" }}
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(sshPubKey)}
                className="btn-secondary"
                style={{ marginTop: "6px", width: "100%" }}
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>
      )}

      {error && method !== "device_flow" && (
        <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>
      )}

      {showSaveButton && (
        <button type="button" onClick={handleSave} className="btn-primary">
          Save Git Settings
        </button>
      )}
    </div>
  );
}
