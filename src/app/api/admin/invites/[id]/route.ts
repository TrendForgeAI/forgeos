export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const invite = await prisma.invite.findUnique({ where: { id } });
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (invite.usedAt) {
      return NextResponse.json({ error: "Cannot revoke an already used invite" }, { status: 409 });
    }

    await prisma.invite.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Revoke invite error:", err);
    return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
  }
}
