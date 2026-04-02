"use client";

import { useRef } from "react";
import ClaudeSettings from "@/components/settings/ClaudeSettings";
import CodexSettings from "@/components/settings/CodexSettings";

type CodexMethod = "api_key" | "device_flow" | "azure" | "skip";

interface CodexData {
  method: CodexMethod;
  apiKey?: string;
  azureEndpoint?: string;
  azureKey?: string;
  authenticated?: boolean;
}

interface AIData {
  claude: { method: string; value: string } | null;
  codex: CodexData | null;
}

interface Props {
  onComplete: (data: AIData) => void;
}

export default function AIStep({ onComplete }: Props) {
  const claudeData = useRef<AIData["claude"]>(null);
  const codexData = useRef<CodexData | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>AI Providers</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Configure Claude and/or Codex. Both are optional.</p>
      </div>

      <div>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Claude (Anthropic)</h3>
        <ClaudeSettings
          onSave={(d) => {
            claudeData.current = d ? { method: d.method, value: d.value ?? "" } : null;
          }}
        />
      </div>

      <div>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Codex (OpenAI)</h3>
        <CodexSettings
          onSave={(d) => {
            codexData.current = d ?? null;
          }}
        />
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={() => onComplete({ claude: claudeData.current, codex: codexData.current })}
      >
        Continue →
      </button>
    </div>
  );
}
