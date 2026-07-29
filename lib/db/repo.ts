// Supabase-backed data layer (core entities). Same intent as lib/store.ts, but async
// and durable. These are the functions the API routes / Lambda handlers will call.
//
// Mapping notes:
//  - Domain `Table.id` is the QR token (keeps guest URLs /r/<slug>/t/<token> unchanged);
//    the DB uuid `venue_tables.id` stays internal.
//  - Every query is scoped by tenant_id in code (service-role bypasses RLS).

import { db } from "./client";
import { money } from "../format";
import type {
  LoyaltySnapshot,
  MenuItem,
  Order,
  OrderLine,
  OrderStatus,
  ParsedMenuItem,
  Restaurant,
  Reward,
  RewardKind,
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

async function genGuestCode(tid: string): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 12; i++) {
    const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    const { data } = await db().from("guests").select("id").eq("tenant_id", tid).eq("code", code).maybeSingle();
    if (!data) return code;
  }
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function rollScratch(currency: string, cfg: Settings["scratch"]): { label: string; kind: RewardKind; value?: number } {
  const r = Math.random();
  if (r < cfg.amountOdds) return { label: `${money(cfg.amount, currency)} off your next visit`, kind: "amount", value: cfg.amount };
  if (r < cfg.amountOdds + cfg.freeItemOdds) return { label: "A free dessert on your next visit", kind: "freeItem" };
  return { label: "No prize this time — but your loyalty stamp is in ⭐", kind: "none" };
}

/** Insert a reward for a guest and return the domain Reward (with its new id). */
async function addReward(
  tid: string,
  guestId: string,
  r: { label: string; kind: RewardKind; value?: number },
  ttlMs: number,
): Promise<Reward> {
  const expiresAt = Date.now() + ttlMs;
  const { data } = await db()
    .from("rewards")
    .insert({ tenant_id: tid, guest_id: guestId, label: r.label, kind: r.kind, value: r.value ?? null, expires_at: new Date(expiresAt).toISOString(), redeemed: false })
    .select("id")
    .single();
  return { id: data!.id, label: r.label, kind: r.kind, value: r.value, expiresAt, redeemed: false };
}

async function tenantId(slug: string): Promise<string | undefined> {
  const { data } = await db().from("tenants").select("id").eq("slug", slug).maybeSingle();
  return data?.id;
}

export async function getRestaurant(slug: string): Promise<Restaurant | undefined> {
  const { data: t } = await db()
    .from("tenants")
    .select("id,slug,name,address,currency,settings")
    .eq("slug", slug)
    .maybeSingle();
  if (!t) return undefined;

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
}

export async function getSettings(slug: string): Promise<Settings | undefined> {
  const { data } = await db().from("tenants").select("settings").eq("slug", slug).maybeSingle();
  return (data?.settings as Settings) ?? undefined;
}

export async function updateSettings(slug: string, next: Settings): Promise<Settings | undefined> {
  const { data } = await db().from("tenants").update({ settings: next }).eq("slug", slug).select("settings").maybeSingle();
  return (data?.settings as Settings) ?? undefined;
}

export async function createOrder(
  slug: string,
  tableToken: string,
  lines: OrderLine[],
): Promise<Order | undefined> {
  const tid = await tenantId(slug);
  if (!tid) return undefined;

  // Anti-spoof: the table token must exist for this tenant.
  const { data: table } = await db()
    .from("venue_tables")
    .select("id,label")
    .eq("tenant_id", tid)
    .eq("token", tableToken)
    .maybeSingle();
  if (!table) return undefined;

  const { data: t } = await db().from("tenants").select("currency").eq("id", tid).maybeSingle();
  if (!t) return undefined;
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const { data: order } = await db()
    .from("orders")
    .insert({ tenant_id: tid, table_id: table.id, table_label: table.label, currency: t.currency, total, status: "received" })
    .select("id,created_at")
    .single();
  if (!order) return undefined;

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
    currency: t.currency,
    status: "received",
    createdAt: new Date(order.created_at).getTime(),
  };
}

export async function listOrders(slug: string): Promise<Order[]> {
  const tid = await tenantId(slug);
  if (!tid) return [];
  const { data } = await db()
    .from("orders")
    .select("id,table_label,total,currency,status,created_at,order_lines(name,price,qty)")
    .eq("tenant_id", tid)
    .order("created_at", { ascending: false });
  return (data ?? []).map((o) => rowToOrder(o, slug));
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const { data } = await db()
    .from("orders")
    .select("id,tenant_id,table_label,total,currency,status,created_at,order_lines(name,price,qty),tenants(slug)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return undefined;
  // @ts-expect-error nested relation typing from the query builder
  return rowToOrder(data, data.tenants.slug);
}

const NEXT: Record<OrderStatus, OrderStatus> = {
  received: "preparing",
  preparing: "ready",
  ready: "served",
  served: "served",
};

export async function advanceOrder(id: string): Promise<Order | undefined> {
  const current = await getOrder(id);
  if (!current) return undefined;
  await db().from("orders").update({ status: NEXT[current.status] }).eq("id", id);
  return { ...current, status: NEXT[current.status] };
}

/**
 * Place an order and, if the guest identified themselves, run the loyalty loop on
 * Supabase: enrol with a head start, add a stamp, complete the card, run the A→B→C
 * referral chain, and mint a variable scratch reward. All driven by tenant settings.
 */
export async function placeOrder(
  slug: string,
  tableToken: string,
  lines: OrderLine[],
  phone?: string,
  name?: string,
  ref?: string,
): Promise<OrderBundle | undefined> {
  const order = await createOrder(slug, tableToken, lines);
  if (!order) return undefined;
  if (!phone || normalizePhone(phone).length < 7) return { order };

  const tid = (await tenantId(slug))!;
  const cfg = (await getSettings(slug))!;
  const ttlMs = cfg.loyalty.rewardTtlDays * 24 * 60 * 60 * 1000;
  const nowIso = new Date().toISOString();
  const np = normalizePhone(phone);

  // Upsert guest.
  let { data: guest } = await db().from("guests").select("*").eq("tenant_id", tid).eq("phone", np).maybeSingle();
  const isNew = !guest;
  if (!guest) {
    const code = await genGuestCode(tid);
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

  const patch: Record<string, unknown> = { visits: guest.visits + 1, last_visit_at: nowIso };
  if (name?.trim() && !guest.name) patch.name = name.trim();

  // Loyalty stamp card.
  let stamps = guest.stamps;
  let loyaltyJustCompleted = false;
  if (cfg.features.loyalty) {
    stamps += 1;
    if (stamps >= guest.stamp_goal) {
      stamps -= guest.stamp_goal;
      await addReward(tid, guest.id, { label: "🎉 Free dessert — your loyalty card is complete!", kind: "freeItem" }, ttlMs);
      loyaltyJustCompleted = true;
    }
  }
  patch.stamps = stamps;

  // Two-sided + chained referral.
  let referredCredited = false;
  let referralName: string | undefined;
  if (cfg.features.referral && isNew && ref) {
    const { data: direct } = await db().from("guests").select("*").eq("tenant_id", tid).eq("code", ref.toUpperCase()).maybeSingle();
    if (direct && direct.id !== guest.id) {
      const off = money(cfg.referral.value, order.currency);
      patch.referred_by = direct.code;
      await addReward(tid, guest.id, { label: `${off} off your next visit — welcome gift 🎁`, kind: "amount", value: cfg.referral.value }, ttlMs);
      await addReward(tid, direct.id, { label: `${guest.name ?? name?.trim() ?? "A friend"} you invited just ordered — ${off} off your next visit 🙌`, kind: "amount", value: cfg.referral.value }, ttlMs);
      await db().from("guests").update({ referrals: direct.referrals + 1 }).eq("id", direct.id);
      referredCredited = true;
      referralName = direct.name ?? undefined;

      if (direct.referred_by) {
        const { data: grand } = await db().from("guests").select("*").eq("tenant_id", tid).eq("code", direct.referred_by).maybeSingle();
        if (grand && grand.id !== guest.id && grand.id !== direct.id) {
          const off2 = money(cfg.referral.level2Value, order.currency);
          await addReward(tid, grand.id, { label: `Your invite chain grew — ${off2} off your next visit 🌱`, kind: "amount", value: cfg.referral.level2Value }, ttlMs);
          await db().from("guests").update({ referrals: grand.referrals + 1 }).eq("id", grand.id);
        }
      }
    }
  }

  await db().from("guests").update(patch).eq("id", guest.id);

  // Variable scratch reward — capture its id for the order + bundle.
  let scratch: Reward | undefined;
  if (cfg.features.scratchReward) {
    scratch = await addReward(tid, guest.id, rollScratch(order.currency, cfg.scratch), ttlMs);
  }
  await db().from("orders").update({ guest_id: guest.id, reward_id: scratch?.id ?? null }).eq("id", order.id);
  order.guestPhone = np;
  order.rewardId = scratch?.id;

  return {
    order,
    reward: scratch,
    loyalty: {
      name: guest.name ?? (name?.trim() || undefined),
      visits: guest.visits + 1,
      stamps,
      goal: guest.stamp_goal,
      startedWithHeadStart: isNew,
      loyaltyJustCompleted,
      code: guest.code,
      referrals: guest.referrals,
      referredCredited,
      referralName,
    },
  };
}

/** Order + its reward + a loyalty snapshot, for the guest status screen. */
export async function getOrderBundle(id: string): Promise<OrderBundle | undefined> {
  const order = await getOrder(id);
  if (!order) return undefined;
  const { data: row } = await db().from("orders").select("guest_id,reward_id").eq("id", id).maybeSingle();
  if (!row?.guest_id) return { order };

  const { data: guest } = await db().from("guests").select("name,visits,stamps,stamp_goal,code,referrals").eq("id", row.guest_id).maybeSingle();
  let reward: Reward | undefined;
  if (row.reward_id) {
    const { data: rw } = await db().from("rewards").select("id,label,kind,value,expires_at,redeemed").eq("id", row.reward_id).maybeSingle();
    if (rw) reward = { id: rw.id, label: rw.label, kind: rw.kind, value: rw.value ?? undefined, expiresAt: new Date(rw.expires_at).getTime(), redeemed: rw.redeemed };
  }
  const loyalty: LoyaltySnapshot | undefined = guest
    ? {
        name: guest.name ?? undefined,
        visits: guest.visits,
        stamps: guest.stamps,
        goal: guest.stamp_goal,
        startedWithHeadStart: false,
        loyaltyJustCompleted: false,
        code: guest.code,
        referrals: guest.referrals,
      }
    : undefined;
  return { order, reward, loyalty };
}

/** Recognition: a returning guest's loyalty snapshot, or undefined if unknown. */
export async function getGuestSnapshot(
  slug: string,
  phone: string,
): Promise<{ name?: string; visits: number; stamps: number; goal: number; activeRewards: number } | undefined> {
  const tid = await tenantId(slug);
  if (!tid) return undefined;
  const { data: guest } = await db().from("guests").select("id,name,visits,stamps,stamp_goal").eq("tenant_id", tid).eq("phone", normalizePhone(phone)).maybeSingle();
  if (!guest) return undefined;
  const { count } = await db()
    .from("rewards")
    .select("*", { count: "exact", head: true })
    .eq("guest_id", guest.id)
    .eq("redeemed", false)
    .neq("kind", "none")
    .gt("expires_at", new Date().toISOString());
  return { name: guest.name ?? undefined, visits: guest.visits, stamps: guest.stamps, goal: guest.stamp_goal, activeRewards: count ?? 0 };
}

/** Resolve an invite code to its owner (for the "invited by a friend" banner). */
export async function getReferrer(slug: string, code: string): Promise<{ name?: string } | undefined> {
  const tid = await tenantId(slug);
  if (!tid) return undefined;
  const { data } = await db().from("guests").select("name").eq("tenant_id", tid).eq("code", code.toUpperCase()).maybeSingle();
  return data ? { name: data.name ?? undefined } : undefined;
}

/** Replace a venue's menu from a freshly ingested parse result. */
export async function replaceMenu(slug: string, items: ParsedMenuItem[]): Promise<MenuItem[] | undefined> {
  const tid = await tenantId(slug);
  if (!tid) return undefined;
  await db().from("menu_items").delete().eq("tenant_id", tid);
  if (items.length) {
    await db()
      .from("menu_items")
      .insert(
        items.map((p, i) => ({
          tenant_id: tid,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category || "Menu",
          sort: i,
        })),
      );
  }
  return (await getRestaurant(slug))?.menu;
}

/** Regenerate the table set from a new count. */
export async function setTableCount(slug: string, count: number): Promise<void> {
  const tid = await tenantId(slug);
  if (!tid) return;
  await db().from("venue_tables").delete().eq("tenant_id", tid);
  const n = Math.max(0, Math.min(Math.floor(count), 200));
  const rows = Array.from({ length: n }, (_, i) => ({
    tenant_id: tid,
    label: String(i + 1),
    token: `t-${i + 1}-${Math.random().toString(36).slice(2, 10)}`,
  }));
  if (rows.length) await db().from("venue_tables").insert(rows);
}

/** Anonymous, aggregate "what others are ordering" from the last 24h. */
export async function getTrending(slug: string, limit = 5): Promise<{ name: string; qty: number }[]> {
  const tid = await tenantId(slug);
  if (!tid) return [];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: orders } = await db().from("orders").select("id").eq("tenant_id", tid).gte("created_at", since);
  const ids = (orders ?? []).map((o) => o.id);
  if (!ids.length) return [];
  const { data: lines } = await db().from("order_lines").select("name,qty").in("order_id", ids);
  const counts = new Map<string, number>();
  for (const l of lines ?? []) counts.set(l.name, (counts.get(l.name) ?? 0) + l.qty);
  return [...counts.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
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
