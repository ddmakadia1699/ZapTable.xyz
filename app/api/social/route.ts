// GET  /api/social?slug=&sid=        -> presence for this device (join state + people)
// POST /api/social  { slug, sid, name, igHandle?, openToChat }  -> join / update
// The social layer is independent of ordering — anyone who scanned can join.

import { NextResponse } from "next/server";
import { getSocialPresence, joinSocial } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const sid = url.searchParams.get("sid") ?? "";
  if (!slug || !sid) {
    return NextResponse.json({ error: "slug and sid required" }, { status: 400 });
  }
  return NextResponse.json(getSocialPresence(slug, sid));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { slug, sid, name, igHandle, openToChat } = (body ?? {}) as {
    slug?: string;
    sid?: string;
    name?: string;
    igHandle?: string;
    openToChat?: boolean;
  };
  if (!slug || !sid) {
    return NextResponse.json({ error: "slug and sid required" }, { status: 400 });
  }
  const result = joinSocial(slug, sid, name ?? "", igHandle, openToChat);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
