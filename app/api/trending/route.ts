// GET /api/trending?slug=demo-cafe
// Anonymous, aggregate "what others are ordering" - counts only, no identities.

import { NextResponse } from "next/server";
import { getTrending } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  return NextResponse.json({ items: await getTrending(slug) });
}
