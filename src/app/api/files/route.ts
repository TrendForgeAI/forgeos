export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const dir = req.nextUrl.searchParams.get("path") ?? "/workspace";
    const safe = validatePath(dir);

    const entries = await readdir(safe, { withFileTypes: true });
    const items = await Promise.all(
      entries
        .filter(e => !e.name.startsWith(".") || e.name === ".git")
        .map(async (e) => {
          const fullPath = path.join(safe, e.name);
          const s = await stat(fullPath).catch(() => null);
          return {
            name: e.name,
            path: fullPath,
            type: e.isDirectory() ? "dir" : "file",
            size: s?.size ?? 0,
          };
        })
    );

    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ items });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 403) return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to list directory" }, { status: 500 });
  }
}
