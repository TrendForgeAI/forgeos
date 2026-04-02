"use client";

import { TabItem, PanelType } from "./panel-types";

interface Props {
  tabs: TabItem[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: (type: PanelType) => void;
}

const PANEL_ICONS: Record<PanelType, string> = {
  terminal: ">_",
  "chat-claude": "◆",
  "chat-codex": "◇",
  editor: "✎",
  viewer: "👁",
};

export default function TabBar({ tabs, activeTabId, onSelect, onClose, onAdd }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", borderBottom: "1px solid var(--border)", height: "32px", flexShrink: 0, overflow: "hidden" }}>
      {tabs.map(tab => (
        <div key={tab.id} onClick={() => onSelect(tab.id)}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 10px", height: "100%", cursor: "pointer", borderRight: "1px solid var(--border)", fontSize: "12px", background: tab.id === activeTabId ? "var(--bg)" : "transparent", color: tab.id === activeTabId ? "var(--text)" : "var(--muted)", flexShrink: 0, maxWidth: "150px" }}>
          <span style={{ fontSize: "10px" }}>{PANEL_ICONS[tab.type]}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tab.dirty ? "• " : ""}{tab.title}
          </span>
          {tabs.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); onClose(tab.id); }}
              style={{ marginLeft: "2px", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px", lineHeight: 1, padding: "0 2px" }}>×</button>
          )}
        </div>
      ))}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => onAdd("terminal")}
          title="Add terminal"
          style={{ height: "32px", padding: "0 10px", border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "16px" }}>+</button>
      </div>
    </div>
  );
}
