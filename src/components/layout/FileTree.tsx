"use client";

import { useState } from "react";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";

interface TreeItem {
  name: string;
  path: string;
  type: "file" | "dir";
}

interface GitChange {
  status: string;
  path: string;
}

interface Props {
  items: TreeItem[];
  basePath: string;
  gitChanges: GitChange[];
  depth?: number;
  onFileClick: (path: string) => void;
  onRefresh: () => void;
}

export default function FileTree({ items, basePath, gitChanges, depth = 0, onFileClick, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [children, setChildren] = useState<Record<string, TreeItem[]>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TreeItem } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  async function loadChildren(dirPath: string) {
    const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
    const json = await res.json();
    setChildren(c => ({ ...c, [dirPath]: json.items ?? [] }));
  }

  function toggleDir(item: TreeItem) {
    setExpanded(s => {
      const next = new Set(s);
      if (next.has(item.path)) { next.delete(item.path); }
      else { next.add(item.path); loadChildren(item.path); }
      return next;
    });
  }

  function getStatusBadge(itemPath: string, type: "file" | "dir") {
    const rel = itemPath.replace(basePath, "").replace(/^\//, "");
    const match = gitChanges.find(c => c.path === rel || (type === "dir" && c.path.startsWith(rel + "/")));
    if (!match) return null;
    const color = match.status.startsWith("M") ? "var(--warning)" : match.status.startsWith("D") ? "var(--danger)" : "var(--success)";
    return <span style={{ fontSize: "10px", fontWeight: 700, color, marginLeft: "auto" }}>{type === "dir" ? "●" : match.status}</span>;
  }

  async function handleAction(action: string, item: TreeItem, value?: string) {
    if (action === "newfile") {
      const name = prompt("File name:");
      if (!name) return;
      await fetch("/api/files/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "newfile", path: item.path, name }) });
      if (item.type === "dir") { await loadChildren(item.path); setExpanded(s => new Set([...s, item.path])); }
      else onRefresh();
    } else if (action === "mkdir") {
      const name = prompt("Folder name:");
      if (!name) return;
      await fetch("/api/files/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mkdir", path: item.path, name }) });
      if (item.type === "dir") { await loadChildren(item.path); setExpanded(s => new Set([...s, item.path])); }
      else onRefresh();
    } else if (action === "delete") {
      if (!confirm(`Delete "${item.name}"?`)) return;
      await fetch("/api/files/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", path: item.path }) });
      onRefresh();
    } else if (action === "rename" && value) {
      const newPath = item.path.replace(/[^/]+$/, value);
      await fetch("/api/files/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rename", path: item.path, newPath }) });
      setRenaming(null);
      onRefresh();
    }
  }

  return (
    <>
      {items.map(item => (
        <div key={item.path}>
          <div
            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item }); }}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: `3px 8px 3px ${8 + depth * 12}px`, cursor: "pointer", borderRadius: "4px", fontSize: "12px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            onClick={() => item.type === "dir" ? toggleDir(item) : onFileClick(item.path)}>
            <span style={{ color: item.type === "dir" ? "var(--accent)" : "var(--muted)", fontSize: "11px", width: "14px" }}>
              {item.type === "dir" ? (expanded.has(item.path) ? "▾" : "▸") : "·"}
            </span>
            {renaming === item.path ? (
              <input autoFocus value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={() => setRenaming(null)}
                onKeyDown={e => { if (e.key === "Enter") handleAction("rename", item, newName); if (e.key === "Escape") setRenaming(null); }}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: "12px", padding: "1px 4px", background: "var(--bg)", border: "1px solid var(--accent)", borderRadius: "3px", color: "var(--text)", width: "120px" }} />
            ) : (
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{item.name}</span>
            )}
            {getStatusBadge(item.path, item.type)}
          </div>

          {item.type === "dir" && expanded.has(item.path) && children[item.path] && (
            <FileTree
              items={children[item.path]}
              basePath={basePath}
              gitChanges={gitChanges}
              depth={depth + 1}
              onFileClick={onFileClick}
              onRefresh={() => loadChildren(item.path)}
            />
          )}
        </div>
      ))}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            ...(contextMenu.item.type === "dir" ? [
              { label: "New File", action: () => handleAction("newfile", contextMenu.item) },
              { label: "New Folder", action: () => handleAction("mkdir", contextMenu.item) },
            ] : []),
            { label: "Rename", action: () => { setRenaming(contextMenu.item.path); setNewName(contextMenu.item.name); } },
            { label: "Delete", action: () => handleAction("delete", contextMenu.item), danger: true },
          ] as ContextMenuItem[]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
