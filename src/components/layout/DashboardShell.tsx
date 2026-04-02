"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MenuBar from "./MenuBar";
import StatusBar from "./StatusBar";
import Sidebar from "./Sidebar";
import PanelGrid from "./PanelGrid";

const GlobalSettingsOverlay = dynamic(() => import("@/components/settings/GlobalSettingsOverlay"), { ssr: false });
const ProjectSettingsOverlay = dynamic(() => import("@/components/settings/ProjectSettingsOverlay"), { ssr: false });

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
  const [overlay, setOverlay] = useState<"global-settings" | "project-settings" | null>(null);
  const [layout, setLayout] = useState<"single" | "split-h" | "split-v">("single");
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <MenuBar
        user={user}
        orchestrator={orchestrator}
        layout={layout}
        onOrchestratorChange={setOrchestrator}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        onLayoutChange={setLayout}
        onOpenGlobalSettings={() => setOverlay("global-settings")}
        onOpenProjectSettings={() => setOverlay("project-settings")}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {sidebarOpen && (
          <Sidebar
            activeProject={activeProject}
            onSelectProject={setActiveProject}
            onOpenFile={setOpenFilePath}
          />
        )}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <PanelGrid activeProject={activeProject} layout={layout} openFilePath={openFilePath} />
        </main>
      </div>

      <StatusBar orchestrator={orchestrator} activeProject={activeProject} />

      {overlay === "global-settings" && <GlobalSettingsOverlay onClose={() => setOverlay(null)} />}
      {overlay === "project-settings" && <ProjectSettingsOverlay activeProject={activeProject} onClose={() => setOverlay(null)} />}
    </div>
  );
}
