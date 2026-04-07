export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  return NextResponse.json({ email: invite.email });
}

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json();

    if (!token || !name || !password) {
      return NextResponse.json({ error: "token, name, and password required" }, { status: 400 });
    }
    if (password.length < 12) {
      return NextResponse.json({ error: "Password must be at least 12 characters" }, { status: 400 });
    }

    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }

    const existing = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existing) {
      return NextResponse.json({ error: "Account already exists for this email" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.create({
        data: { name, email: invite.email, passwordHash, role: "user" },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
