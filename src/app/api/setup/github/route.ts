export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { setConfig, assertSetupIncomplete, isSetupComplete } from "@/lib/config";
import { getSession } from "@/lib/auth";

const GH_CLIENT_ID = "Ov23liNt3J8bpNqHXYqP"; // GitHub CLI app ID (public)

export async function POST() {
  try {
    await assertSetupIncomplete();

    const res = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GH_CLIENT_ID,
        scope: "repo,read:org,user:email",
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "GitHub device flow initiation failed" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      expiresIn: data.expires_in,
      interval: data.interval,
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 410) return NextResponse.json({ error: "Setup already complete" }, { status: 410 });
    return NextResponse.json({ error: "Failed to start GitHub auth" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Allow if setup is still in progress, OR if user is authenticated
    const done = await isSetupComplete();
    if (done) {
      const session = await getSession();
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pat } = await req.json();
    if (!pat) return NextResponse.json({ error: "pat required" }, { status: 400 });
    await setConfig("github_auth_status", "authenticated");
    await setConfig("github_token", pat);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save PAT" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await assertSetupIncomplete();

    const { deviceCode } = await req.json();
    if (!deviceCode) {
      return NextResponse.json({ error: "deviceCode required" }, { status: 400 });
    }

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GH_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const data = await res.json();

    if (data.access_token) {
      await setConfig("github_auth_status", "authenticated");
      await setConfig("github_access_token", data.access_token);
      return NextResponse.json({ authenticated: true });
    }

    // Still waiting or error
    return NextResponse.json({ authenticated: false, error: data.error });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 410) return NextResponse.json({ error: "Setup already complete" }, { status: 410 });
    return NextResponse.json({ error: "Failed to check GitHub auth" }, { status: 500 });
  }
}
