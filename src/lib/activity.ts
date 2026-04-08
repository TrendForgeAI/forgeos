import { prisma } from "@/lib/db";

const MAX_ENTRIES = 1000;

export type ActivityAction =
  | "login"
  | "commit"
  | "push"
  | "file_write"
  | "project_create"
  | "project_delete";

export async function logActivity(
  userId: string,
  userName: string,
  action: ActivityAction,
  target?: string
) {
  try {
    await prisma.activityLog.create({
      data: { userId, userName, action, target: target ?? null },
    });

    // Retention: keep at most MAX_ENTRIES rows
    const count = await prisma.activityLog.count();
    if (count > MAX_ENTRIES) {
      const oldest = await prisma.activityLog.findMany({
        orderBy: { createdAt: "asc" },
        take: count - MAX_ENTRIES,
        select: { id: true },
      });
      await prisma.activityLog.deleteMany({
        where: { id: { in: oldest.map((r: { id: string }) => r.id) } },
      });
    }
  } catch {
    // Non-critical — never throw from activity logging
  }
}
