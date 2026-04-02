"use client";

import dynamic from "next/dynamic";
import TabBar from "./TabBar";
import { GroupState, TabItem, PanelType, defaultTab } from "./panel-types";
import ChatPanel from "@/components/chat/ChatPanel";

const TerminalPanel = dynamic(() => import("@/components/terminal/TerminalPanel"), { ssr: false });
const EditorPanel = dynamic(
  () => import("@/components/editor/EditorPanel").catch(() => ({ default: () => <div style={{ padding: "20px", color: "var(--muted)" }}>Editor not yet available</div> })),
  { ssr: false }
);

interface Props {
  group: GroupState;
  projectPath: string | null;
  onGroupChange: (g: GroupState) => void;
  openFilePath?: string | null;
}

export default function TabGroup({ group, projectPath, onGroupChange, openFilePath }: Props) {
  const activeTab = group.tabs.find(t => t.id === group.activeTabId) ?? group.tabs[0];

  // Open file in new viewer tab if requested
  if (openFilePath && !group.tabs.find(t => t.filePath === openFilePath)) {
    const tab = defaultTab("viewer", openFilePath);
    const newTabs = [...group.tabs, tab];
    onGroupChange({ tabs: newTabs, activeTabId: tab.id });
  }

  function selectTab(id: string) {
    onGroupChange({ ...group, activeTabId: id });
  }

  function closeTab(id: string) {
    const tab = group.tabs.find(t => t.id === id);
    if (tab?.dirty && !confirm("Unsaved changes — close anyway?")) return;
    const newTabs = group.tabs.filter(t => t.id !== id);
    if (newTabs.length === 0) {
      const fallback = defaultTab("terminal");
      onGroupChange({ tabs: [fallback], activeTabId: fallback.id });
      return;
    }
    const newActive = id === group.activeTabId ? newTabs[newTabs.length - 1].id : group.activeTabId;
    onGroupChange({ tabs: newTabs, activeTabId: newActive });
  }

  function addTab(type: PanelType) {
    const tab = defaultTab(type);
    onGroupChange({ tabs: [...group.tabs, tab], activeTabId: tab.id });
  }

  function updateTab(id: string, changes: Partial<TabItem>) {
    onGroupChange({ ...group, tabs: group.tabs.map(t => t.id === id ? { ...t, ...changes } : t) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <TabBar
        tabs={group.tabs}
        activeTabId={activeTab?.id ?? ""}
        onSelect={selectTab}
        onClose={closeTab}
        onAdd={addTab}
      />
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab?.type === "terminal" && (
          <TerminalPanel projectPath={projectPath ? projectPath : "/workspace"} />
        )}
        {(activeTab?.type === "chat-claude" || activeTab?.type === "chat-codex") && (
          <ChatPanel provider={activeTab.type === "chat-claude" ? "claude" : "codex"} projectPath={projectPath} />
        )}
        {(activeTab?.type === "editor" || activeTab?.type === "viewer") && activeTab.filePath && (
          <EditorPanel
            filePath={activeTab.filePath}
            readOnly={activeTab.type === "viewer"}
            onDirtyChange={(dirty: boolean) => updateTab(activeTab.id, { dirty, type: dirty ? "editor" : activeTab.type })}
            onModeChange={(mode: "viewer" | "editor") => updateTab(activeTab.id, { type: mode })}
          />
        )}
      </div>
    </div>
  );
}
