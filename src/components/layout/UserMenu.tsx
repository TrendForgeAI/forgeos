"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  user: { name: string; email: string };
  onOpenGlobalSettings: () => void;
  onOpenProjectSettings: () => void;
}

export default function UserMenu({ user, onOpenGlobalSettings, onOpenProjectSettings }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue with redirect even if server request fails
    }
    router.push("/login");
  }

  const itemStyle: React.CSSProperties = {
    display: "block", width: "100%", textAlign: "left",
    padding: "8px 16px", border: "none", background: "transparent",
    color: "var(--text)", cursor: "pointer", fontSize: "13px",
    whiteSpace: "nowrap",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: open ? "var(--bg)" : "transparent", color: "var(--text)", cursor: "pointer", fontSize: "13px" }}>
        {user.name}
        <span style={{ fontSize: "10px", color: "var(--muted)" }}>▾</span>
      </button>

      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", minWidth: "180px", zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontSize: "12px", fontWeight: 600 }}>{user.name}</p>
            <p style={{ fontSize: "11px", color: "var(--muted)" }}>{user.email}</p>
          </div>
          <button style={itemStyle} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={() => { setOpen(false); }}>Profil</button>
          <button style={itemStyle} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={() => { setOpen(false); onOpenGlobalSettings(); }}>Globale Einstellungen</button>
          <button style={itemStyle} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={() => { setOpen(false); onOpenProjectSettings(); }}>Projekt-Einstellungen</button>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <button style={{ ...itemStyle, color: "var(--danger)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={handleLogout}>Ausloggen</button>
          </div>
        </div>
      )}
    </div>
  );
}
