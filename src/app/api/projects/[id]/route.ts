export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { rm, stat } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** PATCH /api/projects/[id] — rename project or update remote URL */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("developer");
    const { id } = await params;
    const { remoteUrl } = await req.json();

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Validate path is under /workspace
    if (!project.path.startsWith("/workspace/")) {
      return NextResponse.json({ error: "Cannot modify ForgeOS root" }, { status: 400 });
    }

    if (remoteUrl !== undefined) {
      if (remoteUrl) {
        // Set or update remote origin
        try {
          await execFileAsync("git", ["remote", "set-url", "origin", remoteUrl], { cwd: project.path });
        } catch {
          // Remote may not exist yet
          await execFileAsync("git", ["remote", "add", "origin", remoteUrl], { cwd: project.path });
        }
      }
      await prisma.project.update({ where: { id }, data: { repoUrl: remoteUrl || null } });
    }

    const updated = await prisma.project.findUnique({ where: { id } });
    return NextResponse.json({ project: updated });
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === "Unauthorized" || e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Patch project error:", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

/** DELETE /api/projects/[id] — remove project directory + DB entry (admin only) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    // Look up project — could be DB entry or auto-discovered (id = dir name)
    let projectPath: string;
    const dbProject = await prisma.project.findUnique({ where: { id } });

    if (dbProject) {
      projectPath = dbProject.path;
    } else {
      // Auto-discovered project: id is the directory name
      projectPath = `/workspace/${id}`;
    }

    // Security: only /workspace/ sub-directories allowed
    if (!projectPath.startsWith("/workspace/") || projectPath === "/workspace/") {
      return NextResponse.json({ error: "Cannot delete this path" }, { status: 400 });
    }

    // Check directory exists
    try {
      await stat(projectPath);
    } catch {
      return NextResponse.json({ error: "Project directory not found" }, { status: 404 });
    }

    // Remove directory recursively
    await rm(projectPath, { recursive: true, force: true });

    // Remove DB entry if present
    const projectName = dbProject?.name ?? id;
    if (dbProject) {
      await prisma.project.delete({ where: { id } }).catch(() => {});
    }

    logActivity(session.user.id, session.user.name, "project_delete", projectName);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === "Unauthorized" || e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Delete project error:", err);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
