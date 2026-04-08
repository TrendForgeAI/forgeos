export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireRole("viewer");
    const isAdmin = session.user.role === "admin";

    const entries = await prisma.activityLog.findMany({
      where: isAdmin ? undefined : { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
