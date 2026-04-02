export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { setConfig } from "@/lib/config";

const DEVICE_URL = "https://auth.openai.com/codex/device";

export async function POST() {
  try {
    const res = await fetch(DEVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: "codex" }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "OpenAI device flow failed" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      interval: data.interval || 5,
    });
  } catch (err) {
    console.error("Codex device flow error:", err);
    return NextResponse.json({ error: "Failed to start Codex device flow" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { deviceCode } = await req.json();
    const res = await fetch("https://auth.openai.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
        client_id: "codex",
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      await setConfig("codex_auth_method", "device_flow");
      await setConfig("codex_device_token", data.access_token);
      return NextResponse.json({ authenticated: true });
    }
    return NextResponse.json({ authenticated: false, error: data.error });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
