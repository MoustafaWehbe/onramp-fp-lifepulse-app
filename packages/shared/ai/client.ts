import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";

let openaiClient: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({
      apiKey,
      // The SDK bundles node-fetch@2 by default, which has a known history of
      // "Premature close" errors while gunzip-ing longer responses (seen on
      // Windows especially). Node 18+ ships a native, undici-based fetch that
      // handles this far more reliably, so prefer it when available.
      fetch: typeof fetch !== "undefined" ? fetch : undefined,
    });
  }
  return openaiClient;
}

export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming>,
): Promise<string> {
  const client = getAIClient();
  const response = await client.chat.completions.create({
    model: options?.model ?? "gpt-4o-mini",
    messages,
    ...options,
  });
  return response.choices[0]?.message?.content ?? "";
}

/**
 * Chat completion constrained to a Zod schema via OpenAI's Structured
 * Outputs. `zodResponseFormat` gets the model to emit JSON that matches
 * `schema`'s shape even at high temperature, and we still run the result
 * through `schema.parse` ourselves — the installed SDK version doesn't
 * auto-parse `.create()` responses (that's only wired up for the newer
 * Responses API), and re-validating here is cheap insurance regardless.
 * Throws if the model refuses or the response doesn't match the schema.
 */
export async function chatCompletionStructured<T extends z.ZodTypeAny>(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  schema: T,
  schemaName: string,
  options?: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming>,
): Promise<z.infer<T>> {
  const client = getAIClient();
  const completion = await client.chat.completions.create({
    model: options?.model ?? "gpt-4o-mini",
    messages,
    ...options,
    response_format: zodResponseFormat(schema, schemaName),
  });

  const choice = completion.choices[0];
  if (choice?.finish_reason === "content_filter") {
    throw new Error("AI response was blocked by the content filter");
  }
  const content = choice?.message?.content;
  if (!content) {
    throw new Error("AI response was empty");
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("AI response was not valid JSON");
  }
  return schema.parse(json);
}
