export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { validatePath } from "@/lib/files";
import { requireRole } from "@/lib/auth";

const execFileAsync = promisify(execFile);

export async function GET(req: NextRequest) {
  try {
    await requireRole("viewer");
    const repoPath = req.nextUrl.searchParams.get("path") ?? "/workspace";
    const safe = validatePath(repoPath);

    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: safe });
    const changes = stdout.trim().split("\n").filter(Boolean).map(line => ({
      status: line.slice(0, 2).trim(),
      path: line.slice(3),
    }));

    return NextResponse.json({ changes });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 403) return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Git errors (not a git repo, no changes, etc.) → return empty
    return NextResponse.json({ changes: [] });
  }
}
