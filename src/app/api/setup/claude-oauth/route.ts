export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import { setConfig, isSetupComplete } from "@/lib/config";
import { getSession } from "@/lib/auth";

const execFileAsync = promisify(execFile);
const CLAUDE_AUTH_FILE = "/root/.claude/.credentials.json";

export async function POST() {
  // Allow if setup is still in progress, OR if user is authenticated
  const done = await isSetupComplete();
  if (done) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { stdout, stderr } = await execFileAsync("claude", ["auth", "login", "--print-url"], { timeout: 10000 });
    const combined = stdout + "\n" + stderr;
    const urlMatch = combined.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) {
      return NextResponse.json({ error: "Could not get auth URL from claude" }, { status: 500 });
    }
    return NextResponse.json({ url: urlMatch[0] });
  } catch (err) {
    console.error("Claude OAuth start error:", err);
    return NextResponse.json({ error: "Failed to start claude auth" }, { status: 500 });
  }
}

export async function GET() {
  // Allow if setup is still in progress, OR if user is authenticated
  const done = await isSetupComplete();
  if (done) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await access(CLAUDE_AUTH_FILE);
    await setConfig("claude_auth_method", "oauth");
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
