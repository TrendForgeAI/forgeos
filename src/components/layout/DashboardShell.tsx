"use client";

import { useState } from "react";
import MenuBar from "./MenuBar";
import StatusBar from "./StatusBar";
import Sidebar from "./Sidebar";
import PanelGrid from "./PanelGrid";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Props {
  user: User;
}

export default function DashboardShell({ user }: Props) {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orchestrator, setOrchestrator] = useState<"claude" | "codex">("claude");

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflow: "hidden",
      background: "var(--bg)",
    }}>
      <MenuBar
        user={user}
        orchestrator={orchestrator}
        onOrchestratorChange={setOrchestrator}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {sidebarOpen && (
          <Sidebar
            activeProject={activeProject}
            onSelectProject={setActiveProject}
          />
        )}

        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <PanelGrid activeProject={activeProject} />
        </main>
      </div>

      <StatusBar orchestrator={orchestrator} activeProject={activeProject} />
    </div>
  );
}
