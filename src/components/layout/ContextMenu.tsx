"use client";

import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "fixed", left: x, top: y, zIndex: 3000,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      minWidth: "160px", overflow: "hidden",
    }}>
      {items.map((item) => (
        <button key={item.label} onClick={() => { item.action(); onClose(); }} style={{
          display: "block", width: "100%", textAlign: "left",
          padding: "8px 14px", border: "none", background: "transparent",
          color: item.danger ? "var(--danger)" : "var(--text)",
          cursor: "pointer", fontSize: "13px",
        }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
