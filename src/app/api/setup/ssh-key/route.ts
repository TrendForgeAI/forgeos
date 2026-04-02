export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, access, mkdir } from "fs/promises";
import { isSetupComplete } from "@/lib/config";
import { getSession } from "@/lib/auth";

const execFileAsync = promisify(execFile);
const KEY_PATH = "/root/.ssh/id_ed25519";

export async function POST() {
  // Allow if setup is still in progress, OR if user is authenticated
  const done = await isSetupComplete();
  if (done) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    try {
      await access(KEY_PATH);
      const pub = await readFile(`${KEY_PATH}.pub`, "utf-8");
      return NextResponse.json({ publicKey: pub.trim(), existed: true });
    } catch {
      // Key doesn't exist, generate it
    }
    await mkdir("/root/.ssh", { recursive: true });
    await execFileAsync("ssh-keygen", ["-t", "ed25519", "-f", KEY_PATH, "-N", "", "-C", "forgeos"]);
    const pub = await readFile(`${KEY_PATH}.pub`, "utf-8");
    return NextResponse.json({ publicKey: pub.trim(), existed: false });
  } catch (err) {
    console.error("SSH key gen error:", err);
    return NextResponse.json({ error: "Failed to generate SSH key" }, { status: 500 });
  }
}

export async function GET() {
  // Allow if setup is still in progress, OR if user is authenticated
  const done = await isSetupComplete();
  if (done) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pub = await readFile(`${KEY_PATH}.pub`, "utf-8");
    return NextResponse.json({ publicKey: pub.trim() });
  } catch {
    return NextResponse.json({ publicKey: null });
  }
}
