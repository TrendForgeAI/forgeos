"use client";

import { useState } from "react";

interface SetupData {
  admin: { email: string; password: string; name: string } | null;
  git: { name: string; email: string; githubAuth: boolean } | null;
  ai: { claude: { method: string; value: string } | null; codex: { method: string; apiKey?: string; azureEndpoint?: string; azureKey?: string; authenticated?: boolean } | null };
  project: { repoUrl: string; name: string } | null;
}

interface Props {
  setupData: SetupData;
  onComplete: () => void;
}

export default function ProjectStep({ setupData, onComplete }: Props) {
  const [repoUrl, setRepoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          git: setupData.git,
          ai: setupData.ai,
          project: repoUrl ? { repoUrl, name: repoUrl.split("/").pop()?.replace(".git", "") || "project" } : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>First Project</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Optionally clone a Git repository into /workspace. You can skip this.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "13px", color: "var(--muted)" }}>Repository URL (optional)</label>
        <input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/org/repo.git" />
      </div>

      {/* Summary */}
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", fontSize: "13px" }}>
        <p style={{ color: "var(--muted)", marginBottom: "8px", fontWeight: "600" }}>Setup Summary</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span>Admin: {setupData.admin?.email}</span>
          <span>Git: {setupData.git?.name} &lt;{setupData.git?.email}&gt;</span>
          <span>GitHub: {setupData.git?.githubAuth ? "✓ Connected" : "— Skipped"}</span>
          <span>Claude: {setupData.ai.claude ? "✓ API Key" : "— Skipped"}</span>
          <span>Codex: {setupData.ai.codex ? `✓ ${setupData.ai.codex.method}` : "— Skipped"}</span>
        </div>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}

      <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: "8px" }}>
        {saving ? "Saving setup…" : "Complete Setup ✓"}
      </button>
    </form>
  );
}
