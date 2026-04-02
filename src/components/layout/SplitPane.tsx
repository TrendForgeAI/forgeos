"use client";

import { useCallback, useRef } from "react";

interface Props {
  direction: "horizontal" | "vertical";
  ratio: number; // 0.0–1.0
  onRatioChange: (r: number) => void;
  first: React.ReactNode;
  second: React.ReactNode;
}

export default function SplitPane({ direction, ratio, onRatioChange, first, second }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;

    function onMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let r: number;
      if (direction === "horizontal") {
        r = (e.clientX - rect.left) / rect.width;
      } else {
        r = (e.clientY - rect.top) / rect.height;
      }
      onRatioChange(Math.max(0.15, Math.min(0.85, r)));
    }

    function onUp() {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [direction, onRatioChange]);

  const isH = direction === "horizontal";
  const firstSize = `${ratio * 100}%`;
  const splitterStyle: React.CSSProperties = {
    flexShrink: 0,
    background: "var(--border)",
    cursor: isH ? "col-resize" : "row-resize",
    ...(isH ? { width: "4px", height: "100%" } : { width: "100%", height: "4px" }),
  };

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: isH ? "row" : "column", flex: 1, overflow: "hidden" }}>
      <div style={{ ...(isH ? { width: firstSize } : { height: firstSize }), display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {first}
      </div>
      <div style={splitterStyle} onMouseDown={onMouseDown} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {second}
      </div>
    </div>
  );
}
