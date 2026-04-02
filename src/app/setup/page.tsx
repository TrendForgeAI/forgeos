// src/app/setup/page.tsx
import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/config";
import SetupWizard from "@/components/setup/SetupWizard";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const done = await isSetupComplete();
  if (done) redirect("/login");
  return <SetupWizard />;
}
