// GET /api/guest?slug=demo-cafe&phone=+91...
// Recognition: returns a returning guest's loyalty snapshot, or 204 if unknown.
// Used by the guest menu to greet returning diners and show their progress.

import { NextResponse } from "next/server";
import { getGuestSnapshot, getReferrer } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const phone = url.searchParams.get("phone") ?? "";
  const code = url.searchParams.get("code") ?? "";

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  // Resolve an invite code to its owner (for the "invited by a friend" banner).
  if (code) {
    const referrer = await getReferrer(slug, code);
    if (!referrer) return new NextResponse(null, { status: 204 });
    return NextResponse.json({ referrer });
  }

  if (!phone) {
    return NextResponse.json({ error: "phone or code required" }, { status: 400 });
  }
  const snapshot = await getGuestSnapshot(slug, phone);
  if (!snapshot) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ guest: snapshot });
}
