export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertSetupIncomplete } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    await assertSetupIncomplete();

    const { apiKey } = await req.json();
    if (!apiKey) {
      return NextResponse.json({ valid: false, error: "API key required" }, { status: 400 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (res.status === 401) {
      return NextResponse.json({ valid: false, error: "Invalid API key" });
    }
    if (res.status === 403) {
      return NextResponse.json({ valid: false, error: "API key lacks permission" });
    }

    return NextResponse.json({ valid: res.ok });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 410) return NextResponse.json({ error: "Setup already complete" }, { status: 410 });
    return NextResponse.json({ valid: false, error: "Connection failed" }, { status: 500 });
  }
}
