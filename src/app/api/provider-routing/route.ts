import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProviderRouting, setConfig } from "@/lib/config";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routing = await getProviderRouting();
  return NextResponse.json(routing);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.activeOrchestrator) {
    await setConfig("active_orchestrator", body.activeOrchestrator);
  }
  if (body.routing) {
    await setConfig("provider_routing", JSON.stringify(body.routing));
  }

  const updated = await getProviderRouting();
  return NextResponse.json(updated);
}
