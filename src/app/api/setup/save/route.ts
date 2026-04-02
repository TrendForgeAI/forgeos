export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { setConfig, assertSetupIncomplete } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    await assertSetupIncomplete();

    const body = await req.json();
    const { git, ai, project } = body;

    if (git?.name) await setConfig("git_user_name", git.name);
    if (git?.email) await setConfig("git_user_email", git.email);

    if (ai?.claude?.method === "api_key" && ai.claude.value) {
      await setConfig("claude_auth_method", "api_key");
      await setConfig("claude_api_key", ai.claude.value);
    }

    if (ai?.codex?.apiKey) {
      await setConfig("codex_api_key", ai.codex.apiKey);
    }

    if (project?.repoUrl) {
      await setConfig("first_project_repo", project.repoUrl);
    }

    await setConfig("active_orchestrator", "claude");
    await setConfig("provider_routing", JSON.stringify({
      chat: "claude",
      code_edit: "claude",
      planning: "claude",
      terminal_assist: "claude",
    }));

    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 410) return NextResponse.json({ error: "Setup already complete" }, { status: 410 });
    console.error("Setup save error:", err);
    return NextResponse.json({ error: "Failed to save setup" }, { status: 500 });
  }
}
