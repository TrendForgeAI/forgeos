"use client";

import GitSettings from "@/components/settings/GitSettings";

interface Props {
  onComplete: (data: { name: string; email: string; githubAuth: boolean }) => void;
}

export default function GitStep({ onComplete }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>Git Identity</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>
          Connect GitHub via Device Flow, a Personal Access Token, or SSH key.
        </p>
      </div>
      <GitSettings
        onSave={(data) => onComplete({ name: "", email: "", githubAuth: data.githubAuth ?? false })}
      />
      <button
        type="button"
        className="btn-primary"
        onClick={() => onComplete({ name: "", email: "", githubAuth: false })}
        style={{ marginTop: "8px" }}
      >
        Continue →
      </button>
    </div>
  );
}
