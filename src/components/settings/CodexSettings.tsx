"use client";

import { useState, useRef, useEffect } from "react";

type CodexMethod = "api_key" | "device_flow" | "azure" | "skip";

interface Props {
  showSaveButton?: boolean;
  onSave?: (data: { method: CodexMethod; apiKey?: string; azureEndpoint?: string; azureKey?: string; authenticated?: boolean } | null) => void;
}

export default function CodexSettings({ showSaveButton, onSave }: Props) {
  const cancelPollRef = useRef(false);
  const [method, setMethod] = useState<CodexMethod>("api_key");
  const [apiKey, setApiKey] = useState("");
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureKey, setAzureKey] = useState("");
  const [deviceCode, setDeviceCode] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [deviceDone, setDeviceDone] = useState(false);
  const [error, setError] = useState("");

  async function startDeviceFlow() {
    setError("");
    try {
      const res = await fetch("/api/setup/codex-device", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDeviceCode({ userCode: json.userCode, verificationUri: json.verificationUri });
      pollDevice(json.deviceCode, json.interval);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  useEffect(() => {
    return () => { cancelPollRef.current = true; };
  }, []);

  async function pollDevice(code: string, interval: number) {
    cancelPollRef.current = false;
    for (let i = 0; i < 24; i++) {
      if (cancelPollRef.current) return;
      await new Promise(r => setTimeout(r, interval * 1000));
      if (cancelPollRef.current) return;
      try {
        const res = await fetch("/api/setup/codex-device", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: code }),
        });
        const json = await res.json();
        if (json.authenticated) { setDeviceDone(true); return; }
      } catch { /* continue */ }
    }
    setError("Device flow timed out.");
  }

  const sectionStyle: React.CSSProperties = {
    border: "1px solid var(--border)", borderRadius: "8px", padding: "16px",
    display: "flex", flexDirection: "column", gap: "8px",
  };

  const methodBtn = (m: CodexMethod, label: string) => (
    <button key={m} type="button" onClick={() => setMethod(m)} style={{
      padding: "6px 12px", borderRadius: "6px", border: "1px solid",
      borderColor: method === m ? "var(--accent)" : "var(--border)",
      background: method === m ? "rgba(59,130,246,0.1)" : "transparent",
      color: "var(--text)", cursor: "pointer", fontSize: "13px",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {methodBtn("api_key", "API Key")}
        {methodBtn("device_flow", "Device Flow")}
        {methodBtn("azure", "Azure OpenAI")}
        {methodBtn("skip", "Skip")}
      </div>

      {method === "api_key" && (
        <div style={sectionStyle}>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." type="password" />
        </div>
      )}

      {method === "device_flow" && (
        <div style={sectionStyle}>
          {!deviceCode && !deviceDone && (
            <button type="button" onClick={startDeviceFlow} className="btn-secondary" style={{ width: "100%" }}>
              Start Device Flow
            </button>
          )}
          {deviceCode && !deviceDone && (
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
          {deviceDone && <p style={{ color: "var(--success)", fontSize: "13px" }}>✓ OpenAI connected</p>}
          {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
        </div>
      )}

      {method === "azure" && (
        <div style={sectionStyle}>
          <label style={{ fontSize: "13px", color: "var(--muted)" }}>Azure OpenAI Endpoint</label>
          <input value={azureEndpoint} onChange={e => setAzureEndpoint(e.target.value)} placeholder="https://your-resource.openai.azure.com/" />
          <label style={{ fontSize: "13px", color: "var(--muted)" }}>API Key</label>
          <input value={azureKey} onChange={e => setAzureKey(e.target.value)} placeholder="••••••••" type="password" />
        </div>
      )}

      {error && method !== "device_flow" && (
        <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>
      )}

      {showSaveButton && (
        <button type="button" onClick={() => {
          if (method === "api_key") onSave?.({ method, apiKey });
          else if (method === "device_flow" && deviceDone) onSave?.({ method, authenticated: true });
          else if (method === "azure") onSave?.({ method, azureEndpoint, azureKey });
          else onSave?.(null);
        }} className="btn-primary">
          Save Codex Settings
        </button>
      )}
    </div>
  );
}
