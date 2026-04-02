"use client";

import { useState } from "react";
import AdminStep from "@/components/setup/AdminStep";
import GitStep from "@/components/setup/GitStep";
import AIStep from "@/components/setup/AIStep";
import ProjectStep from "@/components/setup/ProjectStep";

type Step = "admin" | "git" | "ai" | "project" | "done";

interface SetupData {
  admin: { email: string; password: string; name: string } | null;
  git: { name: string; email: string; githubAuth: boolean } | null;
  ai: { claude: { method: string; value: string } | null; codex: { method: string; apiKey?: string; azureEndpoint?: string; azureKey?: string; authenticated?: boolean } | null };
  project: { repoUrl: string; name: string } | null;
}

export default function SetupWizard() {
  const [step, setStep] = useState<Step>("admin");
  const [data, setData] = useState<SetupData>({
    admin: null,
    git: null,
    ai: { claude: null, codex: null },
    project: null,
  });

  const steps: Step[] = ["admin", "git", "ai", "project"];
  const stepLabels = ["Admin Account", "Git Identity", "AI Providers", "First Project"];
  const currentIndex = steps.indexOf(step);

  if (step === "done") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✓</div>
          <h2 style={{ color: "var(--success)", marginBottom: "8px" }}>ForgeOS is ready</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>Setup complete. Redirecting to login…</p>
          <a href="/login" className="btn-primary" style={{ padding: "10px 24px", textDecoration: "none", borderRadius: "6px", background: "var(--accent)", color: "white" }}>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>ForgeOS Setup</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>Step {currentIndex + 1} of {steps.length}</p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "100%",
                height: "3px",
                background: i <= currentIndex ? "var(--accent)" : "var(--border)",
                borderRadius: "2px",
                transition: "background 0.3s",
              }} />
              <span style={{ fontSize: "11px", color: i === currentIndex ? "var(--text)" : "var(--muted)" }}>
                {stepLabels[i]}
              </span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "32px" }}>
          {step === "admin" && (
            <AdminStep onComplete={(adminData) => {
              setData(d => ({ ...d, admin: adminData }));
              setStep("git");
            }} />
          )}
          {step === "git" && (
            <GitStep onComplete={(gitData) => {
              setData(d => ({ ...d, git: gitData }));
              setStep("ai");
            }} />
          )}
          {step === "ai" && (
            <AIStep onComplete={(aiData) => {
              setData(d => ({ ...d, ai: aiData }));
              setStep("project");
            }} />
          )}
          {step === "project" && (
            <ProjectStep
              setupData={data}
              onComplete={() => setStep("done")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
