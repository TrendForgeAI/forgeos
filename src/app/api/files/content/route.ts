export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";

const MAX_SIZE = 200 * 1024; // 200 KB

function safePath(input: string | null): string | null {
  if (!input) return null;
  const resolved = resolve(input);
  return resolved.startsWith("/workspace/") ? resolved : null;
}

export async function GET(req: NextRequest) {
  try { await requireRole("viewer"); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const path = safePath(req.nextUrl.searchParams.get("path"));
  if (!path) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  try {
    const buf = await readFile(path);
    if (buf.length > MAX_SIZE)
      return NextResponse.json({ error: "File too large (max 200 KB)" }, { status: 413 });
    if (buf.includes(0))
      return NextResponse.json({ error: "Binary file" }, { status: 415 });
    return NextResponse.json({ content: buf.toString("utf-8"), size: buf.length });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

export async function PUT(req: NextRequest) {
  try { await requireRole("developer"); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json();
  const path = safePath(body.path ?? null);
  if (!path) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  if (typeof body.content !== "string")
    return NextResponse.json({ error: "content required" }, { status: 400 });

  try {
    await writeFile(path, body.content, "utf-8");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Cannot write file" }, { status: 500 });
  }
}
