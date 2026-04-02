export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (session) {
    await deleteSession(session.token);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: "forgeos_session",
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return res;
}
