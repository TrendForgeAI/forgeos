"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  activeProject: string | null;
}

export default function ChatPanel({ activeProject }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Abort in-flight request when project changes
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [activeProject]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          projectPath: activeProject ? `/workspace/${activeProject}` : null,
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Chat error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const chunk: string = JSON.parse(raw);
            setMessages((m) => {
              const updated = [...m];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
              return updated;
            });
          } catch {
            // skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Chat failed";
      setError(msg);
      // Remove empty assistant message on error
      setMessages((m) =>
        m[m.length - 1]?.content === "" ? m.slice(0, -1) : m
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const t = e.currentTarget;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 120) + "px";
  }

  function stopStream() {
    abortRef.current?.abort();
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      borderLeft: "1px solid var(--border)",
      background: "var(--bg)",
      minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "4px 12px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        fontSize: "11px",
        color: "var(--muted)",
        flexShrink: 0,
      }}>
        chat{activeProject ? ` — ${activeProject}` : ""}
      </div>

      {/* Message list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        {messages.length === 0 && (
          <div style={{
            color: "var(--muted)",
            fontSize: "12px",
            textAlign: "center",
            marginTop: "40px",
            lineHeight: 1.6,
          }}>
            {activeProject
              ? `Ask anything about ${activeProject}`
              : "Select a project, then ask away"}
          </div>
        )}

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const isCursor = streaming && isLast && msg.role === "assistant";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div style={{
                maxWidth: "88%",
                padding: "7px 11px",
                borderRadius: msg.role === "user"
                  ? "12px 12px 3px 12px"
                  : "12px 12px 12px 3px",
                background: msg.role === "user" ? "var(--accent)" : "var(--surface)",
                color: msg.role === "user" ? "white" : "var(--text)",
                fontSize: "13px",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
              }}>
                {msg.content || (isCursor ? null : "")}
                {isCursor && (
                  <span style={{ opacity: 0.6, marginLeft: "1px" }}>▋</span>
                )}
              </div>
            </div>
          );
        })}

        {error && (
          <div style={{
            color: "var(--danger)",
            fontSize: "12px",
            padding: "8px 10px",
            background: "var(--surface)",
            borderRadius: "8px",
            border: "1px solid var(--danger)",
          }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: "10px",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={streaming ? "Generating…" : "Ask… (Enter ↵ send, Shift+Enter newline)"}
            disabled={streaming}
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              minHeight: "34px",
              maxHeight: "120px",
              padding: "7px 10px",
              fontSize: "13px",
              lineHeight: 1.4,
              fontFamily: "inherit",
              overflow: "hidden",
            }}
          />
          <button
            type="button"
            onClick={streaming ? stopStream : send}
            className={streaming ? "btn-secondary" : "btn-primary"}
            style={{
              width: "auto",
              padding: "7px 12px",
              flexShrink: 0,
              alignSelf: "flex-end",
              fontSize: "14px",
            }}
            disabled={!streaming && !input.trim()}
          >
            {streaming ? "■" : "↑"}
          </button>
        </div>
      </div>
    </div>
  );
}
