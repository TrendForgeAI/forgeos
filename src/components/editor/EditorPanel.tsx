"use client";

// Stub for EditorPanel — full implementation in Task 8.
interface Props {
  filePath: string;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onModeChange?: (mode: "viewer" | "editor") => void;
}

export default function EditorPanel({ filePath, readOnly }: Props) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: "8px", padding: "20px" }}>
      <div style={{ fontSize: "32px" }}>✎</div>
      <p style={{ fontSize: "14px", fontWeight: 600 }}>{readOnly ? "Viewer" : "Editor"}</p>
      <p style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--muted)" }}>{filePath}</p>
      <p style={{ fontSize: "12px", textAlign: "center", maxWidth: "240px" }}>
        CodeMirror editor coming soon (Task 8).
      </p>
    </div>
  );
}
