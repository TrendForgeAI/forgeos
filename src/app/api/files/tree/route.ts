export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readdir } from "fs/promises";
import { resolve, join } from "path";

const IGNORE = new Set([".git", "node_modules", "__pycache__", ".venv", "dist", ".next", ".turbo"]);
const MAX_DEPTH = 2;

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

async function listDir(dirPath: string, depth: number): Promise<FileNode[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
    const fullPath = join(dirPath, entry.name);
    const node: FileNode = {
      name: entry.name,
      path: fullPath,
      type: entry.isDirectory() ? "dir" : "file",
    };
    if (entry.isDirectory() && depth < MAX_DEPTH) {
      try {
        node.children = await listDir(fullPath, depth + 1);
      } catch {
        node.children = [];
      }
    }
    nodes.push(node);
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const path = req.nextUrl.searchParams.get("path") ?? "";
  const resolved = resolve(path);
  if (!resolved.startsWith("/workspace/")) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const tree = await listDir(resolved, 0);
    return NextResponse.json({ tree });
  } catch {
    return NextResponse.json({ error: "Cannot read directory" }, { status: 404 });
  }
}
