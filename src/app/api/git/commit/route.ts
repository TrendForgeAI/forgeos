export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { validatePath } from "@/lib/files";
import { requireRole } from "@/lib/auth";
import { getConfig } from "@/lib/config";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    await requireRole("developer");
    const { path: repoPath, message, files } = await req.json();
    if (!repoPath || !message) return NextResponse.json({ error: "path and message required" }, { status: 400 });
    const safe = validatePath(repoPath);

    const gitName = (await getConfig("git_user_name")) ?? "ForgeOS";
    const gitEmail = (await getConfig("git_user_email")) ?? "forgeos@localhost";

    const env = { ...process.env, GIT_AUTHOR_NAME: gitName, GIT_AUTHOR_EMAIL: gitEmail, GIT_COMMITTER_NAME: gitName, GIT_COMMITTER_EMAIL: gitEmail };

    if (files && files.length > 0) {
      for (const f of files) {
        // Make path absolute relative to the repo
        const absF = f.startsWith("/") ? f : path.join(safe, f);
        const safeFile = validatePath(absF);
        if (!safeFile.startsWith(safe + "/") && safeFile !== safe) {
          return NextResponse.json({ error: `File ${f} is outside the repository` }, { status: 400 });
        }
        await execFileAsync("git", ["add", "--", safeFile], { cwd: safe, env });
      }
    } else {
      await execFileAsync("git", ["add", "-A"], { cwd: safe, env });
    }

    const { stdout } = await execFileAsync("git", ["commit", "-m", message], { cwd: safe, env });
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.stderr ?? e.message ?? "Commit failed" }, { status: 500 });
  }
}
