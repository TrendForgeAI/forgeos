export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { assertSetupIncomplete } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    await assertSetupIncomplete();

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 12) {
      return NextResponse.json({ error: "Password must be at least 12 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: { name, email, passwordHash, role: "admin" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 410) return NextResponse.json({ error: "Setup already complete" }, { status: 410 });
    console.error("Admin setup error:", err);
    return NextResponse.json({ error: "Failed to create admin account" }, { status: 500 });
  }
}
