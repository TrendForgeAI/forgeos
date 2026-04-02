export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const repoPath = req.nextUrl.searchParams.get("path") ?? "/workspace";
    const safe = validatePath(repoPath);

    const { stdout } = await execAsync("git status --porcelain", { cwd: safe });
    const changes = stdout.trim().split("\n").filter(Boolean).map(line => ({
      status: line.slice(0, 2).trim(),
      path: line.slice(3),
    }));

    return NextResponse.json({ changes });
  } catch {
    return NextResponse.json({ changes: [] });
  }
}
