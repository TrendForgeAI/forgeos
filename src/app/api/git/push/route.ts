export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { validatePath } from "@/lib/files";
import { requireRole } from "@/lib/auth";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    await requireRole("developer");
    const { path: repoPath } = await req.json();
    if (!repoPath) return NextResponse.json({ error: "path required" }, { status: 400 });
    const safe = validatePath(repoPath);
    const { stdout, stderr } = await execFileAsync("git", ["push"], { cwd: safe, timeout: 30000 });
    return NextResponse.json({ success: true, output: stdout || stderr });
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.stderr ?? e.message ?? "Push failed" }, { status: 500 });
  }
}
