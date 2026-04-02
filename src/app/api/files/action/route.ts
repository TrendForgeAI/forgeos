export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { mkdir, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { action, path: filePath, newPath, name } = await req.json();
    const safe = validatePath(filePath);

    if (action === "mkdir") {
      const dirPath = name ? path.join(safe, name) : safe;
      await mkdir(dirPath, { recursive: true });
    } else if (action === "newfile") {
      const newFile = path.join(safe, name ?? "newfile.txt");
      validatePath(newFile);
      await writeFile(newFile, "", "utf-8");
    } else if (action === "rename") {
      if (!newPath) return NextResponse.json({ error: "newPath required" }, { status: 400 });
      const safeDest = validatePath(newPath);
      await rename(safe, safeDest);
    } else if (action === "delete") {
      await rm(safe, { recursive: true, force: true });
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 403) return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
