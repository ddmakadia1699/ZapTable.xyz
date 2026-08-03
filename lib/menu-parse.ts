// Menu ingestion: turn an uploaded menu (photo or PDF) into a structured menu.
//
// ZapTable's signature onboarding step - the admin uploads their existing menu and
// Claude vision reads it into items, prices and categories.
//
// Provider is chosen by env:
//   • LLM_PROVIDER=bedrock  -> AWS Bedrock (model `anthropic.claude-opus-4-8`),
//                              credentials from the standard AWS chain (env/profile/role).
//   • else ANTHROPIC_API_KEY -> Anthropic API direct (model `claude-opus-4-8`).
//   • else                   -> a deterministic mock, so the demo runs with no keys.

import Anthropic from "@anthropic-ai/sdk";
import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { z } from "zod";
import type { ParsedMenuItem } from "./types";

const MenuSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number(),
      category: z.string(),
    }),
  ),
});

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface ParseResult {
  items: ParsedMenuItem[];
  source: "anthropic" | "bedrock" | "mock";
}

const PROMPT =
  "This is a restaurant menu. Extract every orderable item. " +
  "Return ONLY a JSON object of the form " +
  '{"items":[{"name","description","price","category"}]} with no prose or markdown. ' +
  "`price` is the printed price as a number in major currency units (e.g. 12.50, no symbol); " +
  "use 0 if missing or unreadable. `category` is the printed section (Starters, Mains, Drinks, Desserts, …). " +
  "Keep descriptions short.";

/**
 * @param data       base64-encoded file contents (no data: prefix)
 * @param mediaType  e.g. "image/jpeg", "image/png", "application/pdf"
 */
export async function parseMenu(data: string, mediaType: string): Promise<ParseResult> {
  const useBedrock = process.env.LLM_PROVIDER === "bedrock";
  const useAnthropic = !useBedrock && !!process.env.ANTHROPIC_API_KEY;
  if (!useBedrock && !useAnthropic) {
    return { items: mockMenu(), source: "mock" };
  }

  const content = buildContent(data, mediaType);
  const text = useBedrock ? await viaBedrock(content) : await viaAnthropic(content);

  const parsed = MenuSchema.safeParse(extractJson(text));
  if (!parsed.success || parsed.data.items.length === 0) {
    // Couldn't read a usable menu - fail soft to the mock so onboarding never dead-ends.
    return { items: mockMenu(), source: "mock" };
  }
  return { items: parsed.data.items, source: useBedrock ? "bedrock" : "anthropic" };
}

// PDFs go in a `document` block; images go in an `image` block. The block shapes are
// identical across the Anthropic and Bedrock clients (same Messages API).
function buildContent(data: string, mediaType: string): Anthropic.ContentBlockParam[] {
  const fileBlock: Anthropic.ContentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: mediaType as ImageMediaType, data } };
  return [fileBlock, { type: "text", text: PROMPT }];
}

function textOf(blocks: Array<{ type: string; text?: string }>): string {
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
}

async function viaAnthropic(content: Anthropic.ContentBlockParam[]): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    messages: [{ role: "user", content }],
  });
  return textOf(response.content);
}

async function viaBedrock(content: Anthropic.ContentBlockParam[]): Promise<string> {
  // Region + credentials resolve from the AWS chain (AWS_REGION, env keys, shared
  // profile, or an IAM role). Enable model access in the Bedrock console first.
  const client = new AnthropicBedrockMantle({ awsRegion: process.env.AWS_REGION });
  const response = await client.messages.create({
    model: process.env.BEDROCK_MODEL_ID || "anthropic.claude-opus-4-8",
    max_tokens: 16000,
    messages: [{ role: "user", content }],
  });
  return textOf(response.content);
}

/** Pull the JSON object out of a model response, tolerating ```json fences. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function mockMenu(): ParsedMenuItem[] {
  return [
    { name: "Garlic Bread", description: "Toasted, herb butter", price: 150, category: "Starters" },
    { name: "Tomato Basil Soup", description: "With croutons", price: 170, category: "Starters" },
    { name: "Penne Arrabbiata", description: "Spicy tomato, chilli, garlic", price: 320, category: "Mains" },
    { name: "Paneer Wrap", description: "Grilled paneer, slaw, mint mayo", price: 260, category: "Mains" },
    { name: "Iced Latte", description: "Double shot over ice", price: 190, category: "Drinks" },
    { name: "Tiramisu", description: "Classic, dusted cocoa", price: 230, category: "Desserts" },
  ];
}
