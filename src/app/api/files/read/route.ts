export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { validatePath } from "@/lib/files";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireRole("viewer");
    const filePath = req.nextUrl.searchParams.get("path");
    if (!filePath) return NextResponse.json({ error: "path required" }, { status: 400 });
    const safe = validatePath(filePath);
    const content = await readFile(safe, "utf-8");
    return NextResponse.json({ content });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; code?: string };
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.status === 403) return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    if (e.code === "ENOENT") return NextResponse.json({ error: "File not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
