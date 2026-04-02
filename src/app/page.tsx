export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/config";
import { getSession } from "@/lib/auth";

export default async function RootPage() {
  const setupDone = await isSetupComplete();
  if (!setupDone) {
    redirect("/setup");
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
