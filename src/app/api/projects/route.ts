export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { readdir } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";

const execFileAsync = promisify(execFile);

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get projects from workspace directory
    let workspaceDirs: string[] = [];
    try {
      const entries = await readdir("/workspace", { withFileTypes: true });
      workspaceDirs = entries
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch {
      workspaceDirs = [];
    }

    // Get projects from DB
    const dbProjects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
    });

    // Merge: workspace dirs not in DB get auto-added
    const dbPaths = new Set(dbProjects.map((p: { path: string }) => p.path));
    const autoProjects = workspaceDirs
      .filter(dir => !dbPaths.has(`/workspace/${dir}`))
      .map(dir => ({
        id: dir,
        name: dir,
        path: `/workspace/${dir}`,
        repoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    return NextResponse.json({ projects: [...dbProjects, ...autoProjects] });
  } catch (err) {
    console.error("Projects error:", err);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("developer");
    const { name, gitUrl } = await req.json();

    if (!name || !NAME_RE.test(name)) {
      return NextResponse.json({ error: "Invalid project name (a–z, 0–9, - _ only, max 50 chars)" }, { status: 400 });
    }

    const targetPath = `/workspace/${name}`;

    // Check if directory already exists
    try {
      await stat(targetPath);
      return NextResponse.json({ error: "A project with that name already exists" }, { status: 409 });
    } catch {
      // Expected: directory does not exist
    }

    if (gitUrl) {
      // git clone with 60s timeout
      await execFileAsync("git", ["clone", "--", gitUrl, targetPath], { timeout: 60_000 });
    } else {
      await execFileAsync("git", ["init", targetPath]);
    }

    const project = await prisma.project.create({
      data: { name, path: targetPath, repoUrl: gitUrl ?? null },
    });

    logActivity(session.user.id, session.user.name, "project_create", name);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { message?: string; stderr?: string; code?: string };
    if (e.message === "Unauthorized" || e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Create project error:", err);
    return NextResponse.json({ error: e.stderr ?? e.message ?? "Failed to create project" }, { status: 500 });
  }
}
