// GET   /api/orders/:id   -> single order bundle (guest status polling)
// PATCH /api/orders/:id   -> advance status (received -> preparing -> ready -> served)

import { NextResponse } from "next/server";
import { advanceOrder, getOrderBundle } from "@/lib/db/repo";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getOrderBundle(id);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bundle);
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await advanceOrder(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}
