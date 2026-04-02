"use client";

import dynamic from "next/dynamic";

const TerminalPanel = dynamic(() => import("@/components/terminal/TerminalPanel"), { ssr: false });

interface Props {
  activeProject: string | null;
}

export default function PanelGrid({ activeProject }: Props) {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <TerminalPanel projectPath={activeProject ? `/workspace/${activeProject}` : "/workspace"} />
    </div>
  );
}
