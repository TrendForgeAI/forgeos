export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isSetupComplete, getConfig } from "@/lib/config";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const complete = await isSetupComplete();
    // After setup, only authenticated users may read provider config
    if (complete) {
      const session = await getSession();
      if (!session) return NextResponse.json({ setupComplete: true, providers: {} });
    }
    const claudeAuth = await getConfig("claude_auth_method");
    const codexAuth = await getConfig("codex_api_key");
    const githubAuth = await getConfig("github_auth_status");

    return NextResponse.json({
      setupComplete: complete,
      providers: {
        claude: claudeAuth ? { method: claudeAuth } : null,
        codex: codexAuth ? { configured: true } : null,
        github: githubAuth === "authenticated" ? { authenticated: true } : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}
