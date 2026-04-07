export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { randomBytes } from "crypto";

const INVITE_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function GET() {
  try {
    await requireAdmin();
    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ invites });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const pendingInvite = await prisma.invite.findFirst({
      where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pendingInvite) {
      return NextResponse.json({ error: "Active invite already exists for this email" }, { status: 409 });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

    const invite = await prisma.invite.create({
      data: { email, token, invitedById: session.user.id, expiresAt },
    });

    return NextResponse.json({ invite: { id: invite.id, email, token, expiresAt } }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Create invite error:", err);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
