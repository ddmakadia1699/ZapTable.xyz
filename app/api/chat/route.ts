// GET  /api/chat?slug=&me=CODE&with=CODE  -> fetch a 1:1 thread
// POST /api/chat  { slug, from, to, text }  -> send a message
// Both sides must be opted-in ("open to chat"); identities are alias-only.

import { NextResponse } from "next/server";
import { getChat, sendChat } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const me = url.searchParams.get("me") ?? "";
  const withCode = url.searchParams.get("with") ?? "";
  if (!slug || !me || !withCode) {
    return NextResponse.json({ error: "slug, me and with required" }, { status: 400 });
  }
  return NextResponse.json(getChat(slug, me, withCode));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { slug, from, to, text } = body as { slug?: string; from?: string; to?: string; text?: string };
  if (!slug || !from || !to || !text) {
    return NextResponse.json({ error: "slug, from, to and text required" }, { status: 400 });
  }
  const result = sendChat(slug, from, to, text);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ message: result }, { status: 201 });
}
