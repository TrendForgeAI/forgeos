"use client";

import { useEffect } from "react";

interface Props {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

export default function Toast({ message, type, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{
      position: "fixed", bottom: "40px", right: "16px", zIndex: 2000,
      background: type === "success" ? "var(--success)" : "var(--danger)",
      color: "white", padding: "10px 16px", borderRadius: "8px",
      fontSize: "13px", maxWidth: "320px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", gap: "10px",
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>×</button>
    </div>
  );
}
