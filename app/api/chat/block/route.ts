// POST /api/chat/block  { me, target }
// Block (also used for "report & block") - stops messages both ways.

import { NextResponse } from "next/server";
import { blockChat } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { me, target } = (body ?? {}) as { me?: string; target?: string };
  if (!me || !target) {
    return NextResponse.json({ error: "me and target required" }, { status: 400 });
  }
  blockChat(me, target);
  return NextResponse.json({ ok: true });
}
