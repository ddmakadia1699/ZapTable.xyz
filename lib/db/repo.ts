// Supabase-backed data layer (core entities) with seamless in-memory fallback.
//
// Automatically falls back to lib/store.ts if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
// environment variables are missing or if database queries fail.

import { db, hasSupabase } from "./client";

import * as store from "../store";
import type {
  LoyaltySnapshot,
  MenuItem,
  Order,
  OrderLine,
  OrderStatus,
  ParsedMenuItem,
  Restaurant,
  Reward,
  Settings,
  Table,
} from "../types";

export const DEMO_SLUG = "demo-cafe";

export interface OrderBundle {
  order: Order;
  reward?: Reward;
  loyalty?: LoyaltySnapshot;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export async function getRestaurant(slug: string): Promise<Restaurant | undefined> {
  if (!hasSupabase()) {
    return store.getRestaurant(slug);
  }
  try {
    const { data: t } = await db()
      .from("tenants")
      .select("id,slug,name,address,currency,settings")
      .eq("slug", slug)
      .maybeSingle();
    if (!t) return store.getRestaurant(slug);

    const [{ data: menu }, { data: tables }] = await Promise.all([
      db().from("menu_items").select("id,name,description,price,category,available").eq("tenant_id", t.id).order("sort"),
      db().from("venue_tables").select("token,label").eq("tenant_id", t.id).order("label"),
    ]);

    return {
      slug: t.slug,
      name: t.name,
      address: t.address ?? undefined,
      currency: t.currency,
      settings: t.settings as Settings,
      menu: (menu ?? []).map(
        (m): MenuItem => ({
          id: m.id,
          name: m.name,
          description: m.description ?? undefined,
          price: Number(m.price),
          category: m.category,
          available: m.available,
        }),
      ),
      tables: (tables ?? []).map((v): Table => ({ id: v.token, label: v.label })),
    };
  } catch (err) {
    console.warn("Supabase query failed in getRestaurant, using store fallback:", err);
    return store.getRestaurant(slug);
  }
}

export async function getSettings(slug: string): Promise<Settings | undefined> {
  if (!hasSupabase()) {
    return store.getSettings(slug);
  }
  try {
    const { data } = await db().from("tenants").select("settings").eq("slug", slug).maybeSingle();
    return (data?.settings as Settings) ?? store.getSettings(slug);
  } catch (err) {
    console.warn("Supabase query failed in getSettings, using store fallback:", err);
    return store.getSettings(slug);
  }
}

export async function updateSettings(slug: string, next: Settings): Promise<Settings | undefined> {
  if (!hasSupabase()) {
    return store.updateSettings(slug, next);
  }
  try {
    const { data } = await db().from("tenants").update({ settings: next }).eq("slug", slug).select("settings").maybeSingle();
    return (data?.settings as Settings) ?? store.updateSettings(slug, next);
  } catch (err) {
    console.warn("Supabase query failed in updateSettings, using store fallback:", err);
    return store.updateSettings(slug, next);
  }
}

export async function createOrder(
  slug: string,
  tableToken: string,
  lines: OrderLine[],
): Promise<Order | undefined> {
  if (!hasSupabase()) {
    return store.createOrder(slug, tableToken, lines);
  }
  try {
    const { data: tRow } = await db().from("tenants").select("id,currency").eq("slug", slug).maybeSingle();
    if (!tRow) return store.createOrder(slug, tableToken, lines);
    const tid = tRow.id;

    const { data: table } = await db()
      .from("venue_tables")
      .select("id,label")
      .eq("tenant_id", tid)
      .eq("token", tableToken)
      .maybeSingle();
    if (!table) return store.createOrder(slug, tableToken, lines);

    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

    const { data: order } = await db()
      .from("orders")
      .insert({ tenant_id: tid, table_id: table.id, table_label: table.label, currency: tRow.currency, total, status: "received" })
      .select("id,created_at")
      .single();
    if (!order) return store.createOrder(slug, tableToken, lines);

    await db()
      .from("order_lines")
      .insert(lines.map((l) => ({ tenant_id: tid, order_id: order.id, name: l.name, price: l.price, qty: l.qty })));

    return {
      id: order.id,
      restaurantSlug: slug,
      tableId: tableToken,
      tableLabel: table.label,
      lines,
      total,
      currency: tRow.currency,
      status: "received",
      createdAt: new Date(order.created_at).getTime(),
    };
  } catch (err) {
    console.warn("Supabase error in createOrder, falling back to store:", err);
    return store.createOrder(slug, tableToken, lines);
  }
}

export async function listOrders(slug: string): Promise<Order[]> {
  if (!hasSupabase()) {
    return store.listOrders(slug);
  }
  try {
    const { data: t } = await db().from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!t) return store.listOrders(slug);

    const { data } = await db()
      .from("orders")
      .select("id,table_label,total,currency,status,created_at,order_lines(name,price,qty)")
      .eq("tenant_id", t.id)
      .order("created_at", { ascending: false });

    return (data ?? []).map((o) => rowToOrder(o, slug));
  } catch (err) {
    console.warn("Supabase error in listOrders, falling back to store:", err);
    return store.listOrders(slug);
  }
}

export async function getOrder(id: string): Promise<Order | undefined> {
  if (!hasSupabase()) {
    return store.getOrder(id);
  }
  try {
    const { data } = await db()
      .from("orders")
      .select("id,tenant_id,table_label,total,currency,status,created_at,order_lines(name,price,qty),tenants(slug)")
      .eq("id", id)
      .maybeSingle();
    if (!data) return store.getOrder(id);
    // @ts-expect-error nested relation typing from the query builder
    return rowToOrder(data, data.tenants.slug);
  } catch (err) {
    console.warn("Supabase error in getOrder, falling back to store:", err);
    return store.getOrder(id);
  }
}

const NEXT: Record<OrderStatus, OrderStatus> = {
  received: "preparing",
  preparing: "ready",
  ready: "served",
  served: "served",
};

export async function advanceOrder(id: string): Promise<Order | undefined> {
  if (!hasSupabase()) {
    return store.advanceOrder(id);
  }
  try {
    const current = await getOrder(id);
    if (!current) return store.advanceOrder(id);
    await db().from("orders").update({ status: NEXT[current.status] }).eq("id", id);
    return { ...current, status: NEXT[current.status] };
  } catch (err) {
    console.warn("Supabase error in advanceOrder, falling back to store:", err);
    return store.advanceOrder(id);
  }
}

export async function placeOrder(
  slug: string,
  tableToken: string,
  lines: OrderLine[],
  phone?: string,
  name?: string,
  ref?: string,
): Promise<OrderBundle | undefined> {
  if (!hasSupabase()) {
    return store.placeOrder(slug, tableToken, lines, phone, name, ref);
  }
  try {
    const order = await createOrder(slug, tableToken, lines);
    if (!order) return store.placeOrder(slug, tableToken, lines, phone, name, ref);
    if (!phone || normalizePhone(phone).length < 7) return { order };

    const { data: t } = await db().from("tenants").select("id,settings").eq("slug", slug).maybeSingle();
    if (!t) return { order };
    const tid = t.id;
    const cfg = (t.settings as Settings) ?? store.DEFAULT_SETTINGS;

    const nowIso = new Date().toISOString();
    const np = normalizePhone(phone);

    let { data: guest } = await db().from("guests").select("*").eq("tenant_id", tid).eq("phone", np).maybeSingle();
    const isNew = !guest;
    if (!guest) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data: inserted } = await db()
        .from("guests")
        .insert({
          tenant_id: tid,
          phone: np,
          name: name?.trim() || null,
          visits: 0,
          stamps: cfg.features.loyalty ? cfg.loyalty.headStart : 0,
          stamp_goal: cfg.loyalty.stampGoal,
          code,
          referrals: 0,
        })
        .select("*")
        .single();
      guest = inserted;
    }

    if (!guest) return { order };

    const patch: Record<string, unknown> = { visits: guest.visits + 1, last_visit_at: nowIso };
    if (name?.trim() && !guest.name) patch.name = name.trim();

    let stamps = guest.stamps;
    let loyaltyJustCompleted = false;
    if (cfg.features.loyalty) {
      stamps += 1;
      if (stamps >= guest.stamp_goal) {
        stamps -= guest.stamp_goal;
        loyaltyJustCompleted = true;
      }
    }
    patch.stamps = stamps;

    await db().from("guests").update(patch).eq("id", guest.id);

    return {
      order,
      loyalty: {
        name: guest.name ?? (name?.trim() || undefined),
        visits: guest.visits + 1,
        stamps,
        goal: guest.stamp_goal,
        startedWithHeadStart: isNew,
        loyaltyJustCompleted,
        code: guest.code,
        referrals: guest.referrals,
      },
    };
  } catch (err) {
    console.warn("Supabase error in placeOrder, falling back to store:", err);
    return store.placeOrder(slug, tableToken, lines, phone, name, ref);
  }
}

export async function getOrderBundle(id: string): Promise<OrderBundle | undefined> {
  if (!hasSupabase()) {
    return store.getOrderBundle(id);
  }
  try {
    const order = await getOrder(id);
    if (!order) return store.getOrderBundle(id);
    return { order };
  } catch (err) {
    console.warn("Supabase error in getOrderBundle, falling back to store:", err);
    return store.getOrderBundle(id);
  }
}

export async function getGuestSnapshot(
  slug: string,
  phone: string,
): Promise<{ name?: string; visits: number; stamps: number; goal: number; activeRewards: number } | undefined> {
  if (!hasSupabase()) {
    return store.getGuestSnapshot(slug, phone);
  }
  try {
    const { data: t } = await db().from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!t) return store.getGuestSnapshot(slug, phone);
    const { data: guest } = await db().from("guests").select("id,name,visits,stamps,stamp_goal").eq("tenant_id", t.id).eq("phone", normalizePhone(phone)).maybeSingle();
    if (!guest) return store.getGuestSnapshot(slug, phone);
    return { name: guest.name ?? undefined, visits: guest.visits, stamps: guest.stamps, goal: guest.stamp_goal, activeRewards: 0 };
  } catch (err) {
    console.warn("Supabase error in getGuestSnapshot, falling back to store:", err);
    return store.getGuestSnapshot(slug, phone);
  }
}

export async function getReferrer(slug: string, code: string): Promise<{ name?: string } | undefined> {
  if (!hasSupabase()) {
    return store.getReferrer(slug, code);
  }
  try {
    const { data: t } = await db().from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!t) return store.getReferrer(slug, code);
    const { data } = await db().from("guests").select("name").eq("tenant_id", t.id).eq("code", code.toUpperCase()).maybeSingle();
    return data ? { name: data.name ?? undefined } : store.getReferrer(slug, code);
  } catch (err) {
    console.warn("Supabase error in getReferrer, falling back to store:", err);
    return store.getReferrer(slug, code);
  }
}

export async function replaceMenu(slug: string, items: ParsedMenuItem[]): Promise<MenuItem[] | undefined> {
  if (!hasSupabase()) {
    const updated = store.replaceMenu(slug, items);
    return updated?.menu;
  }
  try {
    const { data: t } = await db().from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!t) return store.replaceMenu(slug, items)?.menu;
    await db().from("menu_items").delete().eq("tenant_id", t.id);
    if (items.length) {
      await db()
        .from("menu_items")
        .insert(
          items.map((p, i) => ({
            tenant_id: t.id,
            name: p.name,
            description: p.description,
            price: p.price,
            category: p.category || "Menu",
            sort: i,
          })),
        );
    }
    return (await getRestaurant(slug))?.menu;
  } catch (err) {
    console.warn("Supabase error in replaceMenu, falling back to store:", err);
    return store.replaceMenu(slug, items)?.menu;
  }
}

export async function setTableCount(slug: string, count: number): Promise<void> {
  if (!hasSupabase()) {
    return store.setTableCount(slug, count);
  }
  try {
    const { data: t } = await db().from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!t) return store.setTableCount(slug, count);
    await db().from("venue_tables").delete().eq("tenant_id", t.id);
    const n = Math.max(0, Math.min(Math.floor(count), 200));
    const rows = Array.from({ length: n }, (_, i) => ({
      tenant_id: t.id,
      label: String(i + 1),
      token: `t-${i + 1}-${Math.random().toString(36).slice(2, 10)}`,
    }));
    if (rows.length) await db().from("venue_tables").insert(rows);
  } catch (err) {
    console.warn("Supabase error in setTableCount, falling back to store:", err);
    return store.setTableCount(slug, count);
  }
}

export async function getTrending(slug: string, limit = 5): Promise<{ name: string; qty: number }[]> {
  if (!hasSupabase()) {
    return store.getTrending(slug, limit);
  }
  try {
    const { data: t } = await db().from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!t) return store.getTrending(slug, limit);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: orders } = await db().from("orders").select("id").eq("tenant_id", t.id).gte("created_at", since);
    const ids = (orders ?? []).map((o) => o.id);
    if (!ids.length) return store.getTrending(slug, limit);
    const { data: lines } = await db().from("order_lines").select("name,qty").in("order_id", ids);
    const counts = new Map<string, number>();
    for (const l of lines ?? []) counts.set(l.name, (counts.get(l.name) ?? 0) + l.qty);
    return [...counts.entries()]
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit);
  } catch (err) {
    console.warn("Supabase error in getTrending, falling back to store:", err);
    return store.getTrending(slug, limit);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToOrder(o: any, slug: string): Order {
  return {
    id: o.id,
    restaurantSlug: slug,
    tableId: "",
    tableLabel: o.table_label ?? "?",
    lines: (o.order_lines ?? []).map((l: any): OrderLine => ({ itemId: "", name: l.name, price: Number(l.price), qty: l.qty })),
    total: Number(o.total),
    currency: o.currency,
    status: o.status,
    createdAt: new Date(o.created_at).getTime(),
  };
}
