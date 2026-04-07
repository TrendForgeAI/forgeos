"use client";

import { useEffect, useRef } from "react";

interface Props {
  projectPath: string;
}

export default function TerminalPanel({ projectPath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let term: import("@xterm/xterm").Terminal;
    let ws: WebSocket;

    async function init() {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (!containerRef.current) return;

      term = new Terminal({
        theme: {
          background: "#0d0d0d",
          foreground: "#e8e8e8",
          cursor: "#3b82f6",
          selectionBackground: "#3b82f633",
        },
        fontFamily: '"SF Mono", "Fira Code", monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      termRef.current = term;

      // Defer fit until after layout so dimensions are final
      requestAnimationFrame(() => fitAddon.fit());

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal?path=${encodeURIComponent(projectPath)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        fitAddon.fit();
        const { cols, rows } = term;
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      };

      ws.onmessage = (e) => {
        term.write(e.data);
      };

      ws.onclose = () => {
        term.write("\r\n\x1b[90m[disconnected]\x1b[0m\r\n");
      };

      term.onData(data => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "data", data }));
        }
      });

      // Store observer in ref so cleanup can disconnect it
      const observer = new ResizeObserver(() => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          const { cols, rows } = term;
          ws.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      });
      observer.observe(containerRef.current);
      observerRef.current = observer;
    }

    init();

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      termRef.current?.dispose();
      termRef.current = null;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [projectPath]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0d0d0d" }}>
      <div style={{
        padding: "4px 12px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        fontSize: "11px",
        color: "var(--muted)",
        flexShrink: 0,
      }}>
        terminal — {projectPath}
      </div>
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden", padding: "4px" }} />
    </div>
  );
}
