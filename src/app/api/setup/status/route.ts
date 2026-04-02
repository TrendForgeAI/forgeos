import { NextResponse } from "next/server";
import { isSetupComplete, getConfig } from "@/lib/config";

export async function GET() {
  try {
    const complete = await isSetupComplete();
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
