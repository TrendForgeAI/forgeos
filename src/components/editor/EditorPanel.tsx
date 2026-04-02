"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";

type PanelMode = "viewer" | "editor";

interface Props {
  filePath: string;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onModeChange: (mode: PanelMode) => void;
}

function getLanguage(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "ts", "jsx", "tsx", "mjs", "cjs"].includes(ext)) return javascript({ typescript: true });
  if (ext === "css") return css();
  if (["html", "htm"].includes(ext)) return html();
  if (ext === "json") return json();
  if (["md", "mdx"].includes(ext)) return markdown();
  if (ext === "py") return python();
  if (ext === "sql") return sql();
  return javascript(); // fallback
}

export default function EditorPanel({ filePath, readOnly, onDirtyChange, onModeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const savedContentRef = useRef("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const filename = filePath.split("/").pop() ?? filePath;

  // Load file
  useEffect(() => {
    setLoading(true);
    setError("");
    setDirty(false);
    onDirtyChange(false);
    fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
      .then(r => r.json())
      .then(data => { if (data.content !== undefined) { setContent(data.content); savedContentRef.current = data.content; } else setError(data.error ?? "Failed"); })
      .catch(() => setError("Failed to load file"))
      .finally(() => setLoading(false));
  }, [filePath]);

  // Init/reinit CodeMirror when content or readOnly changes
  useEffect(() => {
    if (loading || !containerRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        getLanguage(filePath),
        oneDark,
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !readOnly) {
            const isDirty = update.state.doc.toString() !== savedContentRef.current;
            setDirty(isDirty);
            onDirtyChange(isDirty);
          }
        }),
        EditorView.theme({ "&": { height: "100%" }, ".cm-scroller": { overflow: "auto" } }),
      ],
    });

    viewRef.current = new EditorView({ state, parent: containerRef.current });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [loading, filePath, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    if (!viewRef.current) return;
    const newContent = viewRef.current.state.doc.toString();
    setSaving(true);
    try {
      const res = await fetch("/api/files/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: newContent }),
      });
      if (res.ok) {
        savedContentRef.current = newContent;
        setDirty(false);
        onDirtyChange(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error ?? "Failed to save file");
      }
    } finally {
      setSaving(false);
    }
  }, [filePath, onDirtyChange]);

  // Ctrl+S to save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !readOnly) {
        e.preventDefault();
        handleSave();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleSave, readOnly]);

  if (loading) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading…</div>;
  if (error) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)" }}>{error}</div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0, height: "32px" }}>
        <span style={{ fontSize: "12px", color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {dirty ? "• " : ""}{filename}
        </span>
        {readOnly ? (
          <button onClick={() => onModeChange("editor")} className="btn-secondary" style={{ fontSize: "11px", padding: "2px 10px" }}>Bearbeiten</button>
        ) : (
          <>
            <button onClick={handleSave} className="btn-primary" style={{ fontSize: "11px", padding: "2px 10px" }} disabled={saving || !dirty}>
              {saving ? "…" : "Speichern"}
            </button>
            <button onClick={() => {
              if (dirty && !confirm("Unsaved changes — close?")) return;
              onModeChange("viewer");
            }} className="btn-secondary" style={{ fontSize: "11px", padding: "2px 10px" }}>Schließen</button>
          </>
        )}
      </div>
      {/* Editor */}
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden" }} />
    </div>
  );
}
