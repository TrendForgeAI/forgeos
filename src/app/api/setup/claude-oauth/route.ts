export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import { setConfig } from "@/lib/config";

const execAsync = promisify(exec);
const CLAUDE_AUTH_FILE = "/root/.claude/.credentials.json";

export async function POST() {
  try {
    const { stdout } = await execAsync("claude auth login --print-url 2>&1", { timeout: 10000 });
    const urlMatch = stdout.match(/https?:\/\/[^\s]+/);
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
  try {
    await access(CLAUDE_AUTH_FILE);
    await setConfig("claude_auth_method", "oauth");
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
