import { prisma } from "@/lib/db";

export async function getConfig(key: string): Promise<string | null> {
  const record = await prisma.config.findUnique({ where: { key } });
  return record?.value ?? null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.config.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function isSetupComplete(): Promise<boolean> {
  const adminExists = await prisma.user.findFirst({
    where: { role: "admin" },
  });
  return adminExists !== null;
}

export async function assertSetupIncomplete(): Promise<void> {
  const done = await isSetupComplete();
  if (done) throw Object.assign(new Error("Setup already complete"), { status: 410 });
}

export async function getProviderRouting(): Promise<{
  activeOrchestrator: string;
  routing: Record<string, string>;
}> {
  const orchestrator = (await getConfig("active_orchestrator")) ?? "claude";
  const routingJson = await getConfig("provider_routing");
  const routing = routingJson
    ? JSON.parse(routingJson)
    : {
        chat: "claude",
        code_edit: "claude",
        planning: "claude",
        terminal_assist: "claude",
      };
  return { activeOrchestrator: orchestrator, routing };
}
