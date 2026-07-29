// GET  /api/orders?slug=demo-cafe        -> list orders for the dashboard
// POST /api/orders                        -> place a guest order (+ loyalty/referral)
// Backed by Supabase (lib/db/repo).

import { NextResponse } from "next/server";
import { listOrders, placeOrder } from "@/lib/db/repo";
import type { OrderLine } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  return NextResponse.json({ orders: await listOrders(slug) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { slug, tableId, lines, phone, name, ref } = body as {
    slug?: string;
    tableId?: string;
    lines?: OrderLine[];
    phone?: string;
    name?: string;
    ref?: string;
  };
  if (!slug || !tableId || !Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "slug, tableId and lines are required" }, { status: 400 });
  }

  const bundle = await placeOrder(slug, tableId, lines, phone, name, ref);
  if (!bundle) return NextResponse.json({ error: "Invalid restaurant or table" }, { status: 404 });
  return NextResponse.json(bundle, { status: 201 });
}
