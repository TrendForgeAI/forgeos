export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { readdir } from "fs/promises";

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
    const dbPaths = new Set(dbProjects.map(p => p.path));
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
