export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, access } from "fs/promises";

const execAsync = promisify(exec);
const KEY_PATH = "/root/.ssh/id_ed25519";

export async function POST() {
  try {
    try {
      await access(KEY_PATH);
      const pub = await readFile(`${KEY_PATH}.pub`, "utf-8");
      return NextResponse.json({ publicKey: pub.trim(), existed: true });
    } catch {
      // Key doesn't exist, generate it
    }
    await execAsync(`ssh-keygen -t ed25519 -f ${KEY_PATH} -N "" -C "forgeos"`);
    const pub = await readFile(`${KEY_PATH}.pub`, "utf-8");
    return NextResponse.json({ publicKey: pub.trim(), existed: false });
  } catch (err) {
    console.error("SSH key gen error:", err);
    return NextResponse.json({ error: "Failed to generate SSH key" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const pub = await readFile(`${KEY_PATH}.pub`, "utf-8");
    return NextResponse.json({ publicKey: pub.trim() });
  } catch {
    return NextResponse.json({ publicKey: null });
  }
}
