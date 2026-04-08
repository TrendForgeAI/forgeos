export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getConfig, getProviderRouting } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    await requireRole("developer");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { messages, projectPath } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const { routing } = await getProviderRouting();
  const provider = routing.chat ?? "claude";

  if (provider === "codex") {
    const apiKey = await getConfig("codex_api_key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Codex API key not configured. Set it in Setup → AI Providers." },
        { status: 503 }
      );
    }
    return streamOpenAI(messages, apiKey, projectPath ?? null);
  }

  const apiKey = await getConfig("claude_api_key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Claude API key not configured. Set it in Setup → AI Providers." },
      { status: 503 }
    );
  }
  return streamClaude(messages, apiKey, projectPath ?? null);
}

function systemPrompt(projectPath: string | null): string {
  const base =
    "You are an AI coding assistant in ForgeOS. Help with coding tasks, debugging, and development questions. Be concise and practical.";
  return projectPath
    ? `${base} The user is working in ${projectPath}.`
    : base;
}

async function streamClaude(
  messages: { role: string; content: string }[],
  apiKey: string,
  projectPath: string | null
): Promise<Response> {
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: systemPrompt(projectPath),
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({ error: `Claude API error: ${upstream.status}` }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  return pipeSse(upstream.body!, parseClaude);
}

async function streamOpenAI(
  messages: { role: string; content: string }[],
  apiKey: string,
  projectPath: string | null
): Promise<Response> {
  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt(projectPath) },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({ error: `OpenAI API error: ${upstream.status}` }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  return pipeSse(upstream.body!, parseOpenAI);
}

// Extract text from an Anthropic SSE event object, or null to skip
function parseClaude(event: Record<string, unknown>): string | null {
  if (
    event.type === "content_block_delta" &&
    typeof event.delta === "object" &&
    event.delta !== null
  ) {
    const delta = event.delta as Record<string, unknown>;
    if (delta.type === "text_delta" && typeof delta.text === "string") {
      return delta.text;
    }
  }
  return null;
}

// Extract text from an OpenAI SSE event object, or null to skip
function parseOpenAI(event: Record<string, unknown>): string | null {
  const choices = event.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const delta = (choices[0] as Record<string, unknown>).delta as
    | Record<string, unknown>
    | undefined;
  if (typeof delta?.content === "string") return delta.content;
  return null;
}

// Generic SSE pipe: reads upstream body, extracts text via parser, emits normalized SSE
function pipeSse(
  body: ReadableStream<Uint8Array>,
  parser: (event: Record<string, unknown>) => string | null
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const text = parser(JSON.parse(raw));
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(text)}\n\n`)
                );
              }
            } catch {
              // skip malformed event
            }
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
    },
  });
}
