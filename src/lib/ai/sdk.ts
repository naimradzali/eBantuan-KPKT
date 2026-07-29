// Sistem eBantuan-PEKB — Shared AI SDK helper
// Safe wrappers around z-ai-web-dev-sdk with robust fallback support.
//
// CRITICAL: This module MUST only be imported from server-side code
// (Next.js route.ts files, server actions). Never import in client components.

import ZAI, { type ChatMessage } from "z-ai-web-dev-sdk";

// Singleton instance to avoid re-creating on every request.
let zaiPromise: Promise<unknown> | null = null;

/**
 * Get a shared ZAI client instance. Throws if the SDK cannot be initialised
 * (e.g. missing API key) — callers MUST wrap in try/catch and use a fallback.
 */
export async function getZai(): Promise<{
  chat: {
    completions: {
      create: (opts: {
        messages: ChatMessage[];
        stream?: boolean;
        thinking?: { type: "enabled" | "disabled" };
      }) => Promise<{
        choices?: Array<{ message?: { content?: string } }>;
      }>;
      createVision: (opts: {
        model?: string;
        messages: unknown[];
        thinking?: { type: "enabled" | "disabled" };
      }) => Promise<{
        choices?: Array<{ message?: { content?: string } }>;
      }>;
    };
  };
}> {
  if (!zaiPromise) {
    zaiPromise = ZAI.create();
  }
  return (await zaiPromise) as ReturnType<typeof getZai> extends Promise<infer T>
    ? T
    : never;
}

/**
 * Strip ```json ... ``` fences from an LLM response so JSON.parse can work.
 * Also trims surrounding whitespace. Returns the cleaned string.
 */
export function stripJsonFences(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  // Remove leading ```json or ``` and trailing ```
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "");
    if (s.endsWith("```")) {
      s = s.slice(0, -3).trim();
    }
  }
  return s.trim();
}

/**
 * Best-effort JSON parse of an LLM response. Strips ``` fences first,
 * then attempts JSON.parse. If that fails, tries to locate the first
 * `{` ... last `}` substring. Returns null if all attempts fail.
 */
export function safeParseJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = stripJsonFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract the outermost JSON object/array.
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate) as T;
      } catch {
        /* ignore */
      }
    }
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleaned.slice(firstBracket, lastBracket + 1);
      try {
        return JSON.parse(candidate) as T;
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

/**
 * Call GLM-4.5 chat completions with a system + user message.
 * Returns the raw text content of the assistant's reply.
 * Throws on any SDK error so the caller can fall back deterministically.
 */
export async function chatComplete(
  systemPrompt: string,
  userPrompt: string,
  opts?: { stream?: boolean }
): Promise<string> {
  const zai = await getZai();
  const messages: ChatMessage[] = [
    { role: "assistant", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  const completion = await zai.chat.completions.create({
    messages,
    stream: opts?.stream ?? false,
    thinking: { type: "disabled" },
  });
  const content = completion.choices?.[0]?.message?.content ?? "";
  return content;
}

/**
 * Call the vision model with a text prompt and an image URL/base64.
 * Throws on any SDK error so the caller can fall back.
 */
export async function visionComplete(
  prompt: string,
  imageUrl: string,
  model = "glm-4.6v"
): Promise<string> {
  const zai = await getZai();
  const response = await zai.chat.completions.createVision({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    thinking: { type: "disabled" },
  });
  return response.choices?.[0]?.message?.content ?? "";
}

/**
 * Map a numeric eligibility score to a Bahasa Malaysia cadangan
 * using the supplied AiConfig thresholds (default 70/50).
 */
export function scoreToCadangan(
  skor: number,
  ambangLulus: number,
  ambangSemak: number
): "lulus" | "tolak" | "semak_semula" {
  if (skor >= ambangLulus) return "lulus";
  if (skor >= ambangSemak) return "semak_semula";
  return "tolak";
}
