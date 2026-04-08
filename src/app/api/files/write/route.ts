export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { validatePath } from "@/lib/files";
import { requireRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireRole("developer");
    const { path: filePath, content } = await req.json();
    if (!filePath || content === undefined) return NextResponse.json({ error: "path and content required" }, { status: 400 });
    const safe = validatePath(filePath);
    await mkdir(path.dirname(safe), { recursive: true });
    await writeFile(safe, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
  }
}
