export type PanelType = "terminal" | "chat-claude" | "chat-codex" | "editor" | "viewer";
export type LayoutMode = "single" | "split-h" | "split-v";

export interface TabItem {
  id: string;
  type: PanelType;
  title: string;
  filePath?: string;   // for editor/viewer tabs
  dirty?: boolean;     // unsaved changes
}

export interface GroupState {
  tabs: TabItem[];
  activeTabId: string;
}

export interface LayoutState {
  mode: LayoutMode;
  groupA: GroupState;
  groupB: GroupState;
  splitRatio: number;  // 0.0–1.0, fraction for groupA
}

export function defaultTab(type: PanelType, filePath?: string): TabItem {
  const titles: Record<PanelType, string> = {
    terminal: "Terminal",
    "chat-claude": "Claude",
    "chat-codex": "Codex",
    editor: filePath ? filePath.split("/").pop() ?? "Editor" : "Editor",
    viewer: filePath ? filePath.split("/").pop() ?? "Viewer" : "Viewer",
  };
  return { id: crypto.randomUUID(), type, title: titles[type], filePath, dirty: false };
}

export function defaultLayout(): LayoutState {
  const tab = defaultTab("terminal");
  const tabB = defaultTab("chat-claude");
  return {
    mode: "single",
    groupA: { tabs: [tab], activeTabId: tab.id },
    groupB: { tabs: [tabB], activeTabId: tabB.id },
    splitRatio: 0.5,
  };
}

const STORAGE_KEY = "forgeos_layout_v1";

export function loadLayout(): LayoutState {
  if (typeof window === "undefined") return defaultLayout();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LayoutState;
      // Validate structure to handle stale/malformed data
      const validModes: LayoutMode[] = ["single", "split-h", "split-v"];
      if (
        parsed &&
        validModes.includes(parsed.mode) &&
        Array.isArray(parsed.groupA?.tabs) &&
        Array.isArray(parsed.groupB?.tabs) &&
        typeof parsed.splitRatio === "number"
      ) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return defaultLayout();
}

export function saveLayout(state: LayoutState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
