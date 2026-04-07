"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  filePath: string;
  onClose: () => void;
}

export default function FileEditorPanel({ filePath, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<import("@codemirror/view").EditorView | null>(null);
  const initialContentRef = useRef("");
  const saveRef = useRef<() => void>(() => {});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileName = filePath.split("/").pop() ?? filePath;

  // Mount editor
  useEffect(() => {
    let cancelled = false;
    let view: import("@codemirror/view").EditorView | null = null;

    async function init() {
      try {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Load failed");
        if (cancelled || !containerRef.current) return;

        initialContentRef.current = json.content;

        const [{ EditorView, basicSetup }, { oneDark }] = await Promise.all([
          import("codemirror"),
          import("@codemirror/theme-one-dark"),
        ]);

        if (cancelled || !containerRef.current) return;

        const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
        const langExt = await getLanguageExtension(ext);

        const extensions = [
          basicSetup,
          oneDark,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              setDirty(u.state.doc.toString() !== initialContentRef.current);
            }
          }),
        ];
        if (langExt) extensions.push(langExt);

        view = new EditorView({
          doc: json.content,
          extensions,
          parent: containerRef.current!,
        });
        viewRef.current = view;
        setLoading(false);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      view?.destroy();
      viewRef.current = null;
    };
  }, [filePath, fileName]);

  // Keep saveRef current so the keydown handler always calls latest save
  async function save() {
    if (!viewRef.current || saving) return;
    const content = viewRef.current.state.doc.toString();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/files/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      initialContentRef.current = content;
      setDirty(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }
  saveRef.current = save;

  // Keyboard: Ctrl+S save, ESC close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "32px 16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "min(920px, 95vw)", height: "min(85vh, 700px)",
        display: "flex", flexDirection: "column",
        background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "8px 14px", background: "var(--surface)",
          borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>
            {fileName}
            {dirty && <span style={{ color: "var(--accent)", marginLeft: "6px" }}>●</span>}
          </span>
          {saveError && (
            <span style={{ color: "var(--danger)", fontSize: "12px" }}>{saveError}</span>
          )}
          <button
            type="button" onClick={save}
            className="btn-primary"
            style={{ width: "auto", padding: "4px 12px", fontSize: "12px" }}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button" onClick={onClose}
            className="btn-secondary"
            style={{ width: "auto", padding: "4px 10px", fontSize: "13px" }}
            title="Close (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {loading && (
            <div style={{ padding: "24px", color: "var(--muted)", fontSize: "13px" }}>Loading…</div>
          )}
          {error && (
            <div style={{ padding: "24px", color: "var(--danger)", fontSize: "13px" }}>{error}</div>
          )}
          <div
            ref={containerRef}
            style={{ height: "100%", overflow: "auto", display: loading || error ? "none" : "block" }}
          />
        </div>
      </div>
    </div>
  );
}

async function getLanguageExtension(ext: string) {
  if (["ts", "tsx", "js", "jsx"].includes(ext)) {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({ typescript: ext === "ts" || ext === "tsx", jsx: ext === "tsx" || ext === "jsx" });
  }
  if (ext === "py") {
    const { python } = await import("@codemirror/lang-python");
    return python();
  }
  if (ext === "json") {
    const { json } = await import("@codemirror/lang-json");
    return json();
  }
  if (ext === "md") {
    const { markdown } = await import("@codemirror/lang-markdown");
    return markdown();
  }
  return null;
}
