import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <DashboardShell user={{ id: session.user.id, email: session.user.email, name: session.user.name, role: session.user.role }} />;
}
