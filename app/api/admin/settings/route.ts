// GET  /api/admin/settings?slug=demo-cafe   -> current settings
// PUT  /api/admin/settings  { slug, settings } -> save
//
// THIN ADAPTER ONLY. All logic lives in lib/store (getSettings/updateSettings) so this
// maps 1:1 onto an AWS Lambda handler later — the handler will call the same functions.
// (Admin auth via Supabase JWT gets added when we move to the real backend.)

import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/repo";
import { clampSettings } from "@/lib/settings";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const settings = await getSettings(slug);
  if (!settings) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const { slug, settings } = (body ?? {}) as { slug?: string; settings?: Settings };
  if (!slug || !settings) {
    return NextResponse.json({ error: "slug and settings required" }, { status: 400 });
  }
  const saved = await updateSettings(slug, clampSettings(settings));
  if (!saved) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  return NextResponse.json({ settings: saved });
}
