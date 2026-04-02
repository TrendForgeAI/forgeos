// WebSocket for terminal is handled by the custom server (server.ts)
// This file exists for Next.js routing compatibility
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Terminal requires WebSocket — connect via ws://host/api/terminal" },
    { status: 426 }
  );
}
