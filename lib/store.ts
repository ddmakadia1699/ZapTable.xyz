// In-memory data store for the ZapTable MVP scaffold.
//
// This is intentionally NOT a database — it's a single-process store so the
// demo runs with zero setup. State resets when the server restarts. Swap this
// module for Postgres/Prisma when moving past the scaffold; the function
// signatures below are the seam to do that behind.
//
// We stash the store on `globalThis` so it survives Next.js hot-reloads in dev.

import { money } from "./format";
import type {
  ChatMessage,
  Guest,
  LoyaltySnapshot,
  MenuItem,
  Order,
  OrderLine,
  Participant,
  ParsedMenuItem,
  Restaurant,
  Reward,
  RewardKind,
  Settings,
  Table,
} from "./types";

interface Db {
  restaurants: Map<string, Restaurant>;
  orders: Order[];
  guests: Map<string, Guest>; // keyed by `${slug}:${normalizedPhone}`
  codeIndex: Map<string, string>; // `${slug}:${CODE}` -> guest key (referrals)
  participants: Map<string, Participant>; // social layer, keyed by `${slug}:${sid}`
  pcodeIndex: Map<string, string>; // `${slug}:${CODE}` -> participant key (chat)
  messages: ChatMessage[]; // 1:1 chat messages
  blocks: Map<string, Set<string>>; // CODE -> set of CODEs they blocked
}

// Default owner settings. New tenants start here; the admin tunes them later.
export const DEFAULT_SETTINGS: Settings = {
  features: { ordering: true, loyalty: true, referral: true, scratchReward: true, social: false, chat: false },
  loyalty: { stampGoal: 8, headStart: 2, rewardTtlDays: 7 },
  scratch: { amount: 100, amountOdds: 0.5, freeItemOdds: 0.25 },
  referral: { value: 50, level2Value: 25 },
  streak: { enabled: true },
  levels: [
    { name: "Bronze", minVisits: 0 },
    { name: "Silver", minVisits: 5 },
    { name: "Gold", minVisits: 15 },
  ],
  social: { sessionTtlMinutes: 30, minAge: 18 },
};

const SEED_SLUG = "demo-cafe";

function seed(): Db {
  const menu: MenuItem[] = [
    item("Masala Chai", "Spiced milk tea, brewed to order", 60, "Drinks"),
    item("Cold Brew Coffee", "18-hour slow steep, served over ice", 180, "Drinks"),
    item("Fresh Lime Soda", "Sweet or salted", 90, "Drinks"),
    item("Paneer Tikka", "Char-grilled cottage cheese, mint chutney", 280, "Starters"),
    item("Crispy Corn", "Tossed with chilli, garlic & herbs", 220, "Starters"),
    item("Margherita Pizza", "San Marzano tomato, basil, mozzarella", 360, "Mains"),
    item("Butter Paneer + Naan", "Creamy tomato gravy with two butter naan", 340, "Mains"),
    item("Veg Hakka Noodles", "Wok-tossed with seasonal veg", 240, "Mains"),
    item("Choco Lava Cake", "Warm, molten centre, vanilla scoop", 190, "Desserts"),
  ];

  const tables: Table[] = Array.from({ length: 8 }, (_, i) => ({
    id: `t-${i + 1}-${rand()}`,
    label: String(i + 1),
  }));

  const restaurant: Restaurant = {
    slug: SEED_SLUG,
    name: "Demo Cafe",
    address: "12 Brew Street",
    currency: "INR",
    menu,
    tables,
    // Demo has the social/chat features on so they're visible out of the box.
    settings: { ...DEFAULT_SETTINGS, features: { ...DEFAULT_SETTINGS.features, social: true, chat: true } },
  };

  return {
    restaurants: new Map([[SEED_SLUG, restaurant]]),
    orders: [],
    guests: new Map(),
    codeIndex: new Map(),
    participants: new Map(),
    pcodeIndex: new Map(),
    messages: [],
    blocks: new Map(),
  };
}

function item(
  name: string,
  description: string,
  price: number,
  category: string,
): MenuItem {
  return { id: rand(), name, description, price, category, available: true };
}

function rand(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── singleton ──────────────────────────────────────────────────────────
const g = globalThis as unknown as { __zaptableDb?: Db };
const db: Db = (g.__zaptableDb ??= seed());

export const DEMO_SLUG = SEED_SLUG;

// ── restaurants & menu ─────────────────────────────────────────────────
export function getRestaurant(slug: string): Restaurant | undefined {
  return db.restaurants.get(slug);
}

// ── Settings (admin-controlled) — framework-agnostic service functions. ──
// These are the seam the future AWS Lambda handlers call; today they back onto the
// in-memory store, later onto Supabase, with the same signatures.
export function getSettings(slug: string): Settings | undefined {
  return db.restaurants.get(slug)?.settings;
}

export function updateSettings(slug: string, next: Settings): Settings | undefined {
  const r = db.restaurants.get(slug);
  if (!r) return undefined;
  // Clamp the numeric knobs so a bad admin value can't break the loyalty math.
  next.loyalty.stampGoal = clamp(next.loyalty.stampGoal, 1, 30);
  next.loyalty.headStart = clamp(next.loyalty.headStart, 0, next.loyalty.stampGoal - 1);
  next.loyalty.rewardTtlDays = clamp(next.loyalty.rewardTtlDays, 1, 90);
  next.scratch.amountOdds = clamp(next.scratch.amountOdds, 0, 1);
  next.scratch.freeItemOdds = clamp(next.scratch.freeItemOdds, 0, 1 - next.scratch.amountOdds);
  next.social.sessionTtlMinutes = clamp(next.social.sessionTtlMinutes, 5, 240);
  r.settings = next;
  return r.settings;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Replace a restaurant's whole menu from a freshly ingested parse result. */
export function replaceMenu(slug: string, parsed: ParsedMenuItem[]): Restaurant | undefined {
  const r = db.restaurants.get(slug);
  if (!r) return undefined;
  r.menu = parsed.map((p) => ({
    id: rand(),
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category || "Menu",
    available: true,
  }));
  return r;
}

export function toggleItem(slug: string, itemId: string, available: boolean): void {
  const r = db.restaurants.get(slug);
  const it = r?.menu.find((m) => m.id === itemId);
  if (it) it.available = available;
}

export function setTableCount(slug: string, count: number): void {
  const r = db.restaurants.get(slug);
  if (!r) return;
  r.tables = Array.from({ length: Math.max(0, Math.min(count, 200)) }, (_, i) => ({
    id: `t-${i + 1}-${rand()}`,
    label: String(i + 1),
  }));
}

// ── orders ─────────────────────────────────────────────────────────────
export function createOrder(
  slug: string,
  tableId: string,
  lines: OrderLine[],
): Order | undefined {
  const r = db.restaurants.get(slug);
  if (!r) return undefined;
  // Anti-spoof: only accept orders for a table that actually exists for this
  // venue. Table ids are unguessable random tokens, so you can't order for a
  // table whose QR you don't physically have, and made-up ids are rejected.
  const table = r.tables.find((t) => t.id === tableId);
  if (!table) return undefined;
  const order: Order = {
    id: rand(),
    restaurantSlug: slug,
    tableId,
    tableLabel: table.label,
    lines,
    total: lines.reduce((sum, l) => sum + l.price * l.qty, 0),
    currency: r.currency,
    status: "received",
    createdAt: Date.now(),
  };
  db.orders.unshift(order);
  return order;
}

// ── loyalty & rewards ──────────────────────────────────────────────────
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function guestKey(slug: string, phone: string): string {
  return `${slug}:${normalizePhone(phone)}`;
}

function codeKey(slug: string, code: string): string {
  return `${slug}:${code.toUpperCase()}`;
}

// Short, unambiguous invite codes (no 0/O/1/I) — easy to read off a phone.
function genCode(slug: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (db.codeIndex.has(codeKey(slug, code)));
  return code;
}

/** Resolve an invite code to the referring guest, within a restaurant. */
export function getReferrer(slug: string, code: string): { name?: string } | undefined {
  const key = db.codeIndex.get(codeKey(slug, code));
  const guest = key ? db.guests.get(key) : undefined;
  return guest ? { name: guest.name } : undefined;
}

function makeReward(label: string, kind: RewardKind, value: number | undefined, ttlMs: number): Reward {
  return { id: rand(), label, kind, value, expiresAt: Date.now() + ttlMs, redeemed: false };
}

// Variable reward (the "scratch card"). Odds + amount come from the tenant's settings.
// The randomness is decided here, ONCE, at order time — the client only reveals it.
function rollScratchReward(currency: string, cfg: Settings["scratch"], ttlMs: number): Reward {
  const r = Math.random();
  if (r < cfg.amountOdds) {
    return makeReward(`${money(cfg.amount, currency)} off your next visit`, "amount", cfg.amount, ttlMs);
  }
  if (r < cfg.amountOdds + cfg.freeItemOdds) {
    return makeReward("A free dessert on your next visit", "freeItem", undefined, ttlMs);
  }
  return makeReward("No prize this time — but your loyalty stamp is in ⭐", "none", undefined, ttlMs);
}

export interface OrderBundle {
  order: Order;
  reward?: Reward;
  loyalty?: LoyaltySnapshot;
}

/**
 * Place an order and, if the guest identified themselves, run the loyalty loop:
 * enrol new guests with a head start, add a stamp, complete the card if earned,
 * and mint a variable scratch reward. Returns everything the status screen needs.
 */
// Instagram handles people choose to share. Strip @, keep IG's allowed chars.
function sanitizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
}

// "Left the venue" = inactive longer than the tenant's configured session TTL.
// When that passes, presence is dropped and chats deleted — chat is ephemeral.
function sessionTtlMs(slug: string): number {
  return (db.restaurants.get(slug)?.settings.social.sessionTtlMinutes ?? 30) * 60 * 1000;
}

export function placeOrder(
  slug: string,
  tableId: string,
  lines: OrderLine[],
  phone?: string,
  name?: string,
  ref?: string,
): OrderBundle | undefined {
  const order = createOrder(slug, tableId, lines);
  if (!order) return undefined;
  if (!phone || normalizePhone(phone).length < 7) return { order };

  const cfg = getSettings(slug)!; // restaurant exists since createOrder succeeded
  const ttlMs = cfg.loyalty.rewardTtlDays * 24 * 60 * 60 * 1000;

  const key = guestKey(slug, phone);
  let guest = db.guests.get(key);
  const isNew = !guest;
  const now = Date.now();

  if (!guest) {
    const code = genCode(slug);
    guest = {
      phone: normalizePhone(phone),
      name: name?.trim() || undefined,
      restaurantSlug: slug,
      visits: 0,
      stamps: cfg.features.loyalty ? cfg.loyalty.headStart : 0, // head start — endowed progress
      stampGoal: cfg.loyalty.stampGoal,
      rewards: [],
      code,
      referrals: 0,
      createdAt: now,
      lastVisitAt: now,
    };
    db.guests.set(key, guest);
    db.codeIndex.set(codeKey(slug, code), key);
  }
  if (name?.trim() && !guest.name) guest.name = name.trim();

  guest.visits += 1;
  guest.lastVisitAt = now;

  // ── Loyalty stamp card (admin-toggleable; config-driven) ───────────────
  let loyaltyJustCompleted = false;
  if (cfg.features.loyalty) {
    guest.stamps += 1;
    if (guest.stamps >= guest.stampGoal) {
      guest.stamps -= guest.stampGoal; // carry the overflow into the next card
      guest.rewards.push(makeReward("🎉 Free dessert — your loyalty card is complete!", "freeItem", undefined, ttlMs));
      loyaltyJustCompleted = true;
    }
  }

  // ── Two-sided + chained referral (admin-toggleable; config-driven) ─────
  let referredCredited = false;
  let referralName: string | undefined;
  if (cfg.features.referral && isNew && ref) {
    const directKey = db.codeIndex.get(codeKey(slug, ref));
    const direct = directKey ? db.guests.get(directKey) : undefined;
    if (direct && directKey !== key) {
      const off = money(cfg.referral.value, order.currency);
      guest.referredBy = direct.code;
      guest.rewards.push(makeReward(`${off} off your next visit — welcome gift 🎁`, "amount", cfg.referral.value, ttlMs));

      direct.referrals += 1;
      direct.rewards.push(
        makeReward(
          `${guest.name ?? "A friend"} you invited just ordered — ${off} off your next visit 🙌`,
          "amount",
          cfg.referral.value,
          ttlMs,
        ),
      );
      referredCredited = true;
      referralName = direct.name;

      // One level up: A → B → C — A is rewarded when C joins.
      const grandKey = direct.referredBy ? db.codeIndex.get(codeKey(slug, direct.referredBy)) : undefined;
      const grand = grandKey ? db.guests.get(grandKey) : undefined;
      if (grand && grandKey !== key && grandKey !== directKey) {
        const off2 = money(cfg.referral.level2Value, order.currency);
        grand.referrals += 1;
        grand.rewards.push(
          makeReward(`Your invite chain grew — ${off2} off your next visit 🌱`, "amount", cfg.referral.level2Value, ttlMs),
        );
      }
    }
  }

  // ── Variable scratch reward (admin-toggleable; odds/amount from settings) ─
  let scratch: Reward | undefined;
  if (cfg.features.scratchReward) {
    scratch = rollScratchReward(order.currency, cfg.scratch, ttlMs);
    guest.rewards.push(scratch);
    order.rewardId = scratch.id;
  }
  order.guestPhone = guest.phone;

  return {
    order,
    reward: scratch,
    loyalty: {
      name: guest.name,
      visits: guest.visits,
      stamps: guest.stamps,
      goal: guest.stampGoal,
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
export function getOrderBundle(id: string): OrderBundle | undefined {
  const order = getOrder(id);
  if (!order) return undefined;
  if (!order.guestPhone) return { order };

  const guest = db.guests.get(guestKey(order.restaurantSlug, order.guestPhone));
  if (!guest) return { order };

  return {
    order,
    reward: guest.rewards.find((rw) => rw.id === order.rewardId),
    loyalty: {
      name: guest.name,
      visits: guest.visits,
      stamps: guest.stamps,
      goal: guest.stampGoal,
      startedWithHeadStart: false,
      loyaltyJustCompleted: false,
      code: guest.code,
      referrals: guest.referrals,
    },
  };
}

/** Recognition: returns a returning guest's progress, or undefined if unknown. */
export function getGuestSnapshot(
  slug: string,
  phone: string,
): { name?: string; visits: number; stamps: number; goal: number; activeRewards: number } | undefined {
  const guest = db.guests.get(guestKey(slug, phone));
  if (!guest) return undefined;
  const now = Date.now();
  return {
    name: guest.name,
    visits: guest.visits,
    stamps: guest.stamps,
    goal: guest.stampGoal,
    activeRewards: guest.rewards.filter((r) => !r.redeemed && r.kind !== "none" && r.expiresAt > now).length,
  };
}

// ── Social layer (independent of ordering) ─────────────────────────────
// Anyone who scans can join "meet & chat" with just a name — no order needed.
// Identities are a first name + a public code; never a phone number.
export interface SocialPerson {
  name: string;
  code: string; // public id, used to start a chat
  handle?: string; // IG, if they shared it
  openToChat: boolean;
}
export interface SocialPresence {
  enabled: boolean; // restaurant allows it
  joined: boolean; // this device has joined the social layer
  shared: boolean; // joined AND visible (open to chat and/or shared IG)
  me: SocialPerson | null;
  meOpenToChat: boolean;
  people: SocialPerson[];
}

function pkey(slug: string, sid: string): string {
  return `${slug}:${sid}`;
}

function genParticipantCode(slug: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (db.pcodeIndex.has(codeKey(slug, code)));
  return code;
}

function participantByCode(slug: string, code: string): Participant | undefined {
  const key = db.pcodeIndex.get(codeKey(slug, code));
  return key ? db.participants.get(key) : undefined;
}

function isVisible(p: Participant): boolean {
  return Boolean(p.openToChat || p.igHandle);
}

// Ephemeral cleanup: drop participants who left (stale heartbeat) and delete any
// chat that references someone no longer here. Runs lazily on each social call.
function pruneStale(): void {
  const now = Date.now();
  for (const [key, p] of db.participants) {
    if (p.lastSeen < now - sessionTtlMs(p.slug)) {
      db.participants.delete(key);
      db.pcodeIndex.delete(codeKey(p.slug, p.code));
      db.blocks.delete(p.code.toUpperCase());
    }
  }
  if (db.messages.length) {
    const live = new Set([...db.participants.values()].map((p) => p.code.toUpperCase()));
    db.messages = db.messages.filter((m) => {
      const [a, b] = m.conv.split("~");
      return live.has(a) && live.has(b);
    });
  }
}

function asPerson(p: Participant): SocialPerson {
  return { name: p.name, code: p.code, handle: p.igHandle, openToChat: p.openToChat };
}

/** Join (or update) the social layer for this device — no order required. */
export function joinSocial(
  slug: string,
  sid: string,
  name: string,
  igHandle?: string,
  openToChat?: boolean,
): { code: string } | { error: string } {
  const r = db.restaurants.get(slug);
  if (!r?.settings.features.social) return { error: "Not available here" };
  const cleanName = (name ?? "").trim().slice(0, 40);
  if (!cleanName) return { error: "Please add a name" };

  pruneStale();
  const key = pkey(slug, sid);
  let p = db.participants.get(key);
  const now = Date.now();
  if (!p) {
    const code = genParticipantCode(slug);
    p = { sid, slug, name: cleanName, code, openToChat: false, createdAt: now, lastSeen: now };
    db.participants.set(key, p);
    db.pcodeIndex.set(codeKey(slug, code), key);
  }
  p.name = cleanName;
  p.lastSeen = now;
  if (igHandle !== undefined) {
    const h = sanitizeHandle(igHandle);
    p.igHandle = h || undefined;
  }
  if (openToChat !== undefined) p.openToChat = Boolean(openToChat);
  return { code: p.code };
}

export function getSocialPresence(slug: string, sid: string): SocialPresence {
  const r = db.restaurants.get(slug);
  if (!r?.settings.features.social) {
    return { enabled: false, joined: false, shared: false, me: null, meOpenToChat: false, people: [] };
  }

  const me = db.participants.get(pkey(slug, sid));
  if (me) me.lastSeen = Date.now();
  pruneStale();
  if (!me || !isVisible(me)) {
    return {
      enabled: true,
      joined: Boolean(me),
      shared: false,
      me: me ? asPerson(me) : null,
      meOpenToChat: Boolean(me?.openToChat),
      people: [],
    };
  }

  const now = Date.now();
  const people = [...db.participants.values()]
    .filter(
      (p) =>
        p.slug === slug &&
        p.sid !== sid &&
        isVisible(p) &&
        p.lastSeen > now - sessionTtlMs(slug) &&
        !isBlocked(me.code, p.code),
    )
    .slice(0, 25)
    .map(asPerson);

  return { enabled: true, joined: true, shared: true, me: asPerson(me), meOpenToChat: me.openToChat, people };
}

// ── 1:1 chat (mutual opt-in) ───────────────────────────────────────────
function convId(a: string, b: string): string {
  return [a.toUpperCase(), b.toUpperCase()].sort().join("~");
}

function isBlocked(aCode: string, bCode: string): boolean {
  const a = db.blocks.get(aCode.toUpperCase());
  const b = db.blocks.get(bCode.toUpperCase());
  return Boolean(a?.has(bCode.toUpperCase()) || b?.has(aCode.toUpperCase()));
}

export function sendChat(
  slug: string,
  fromCode: string,
  toCode: string,
  text: string,
): ChatMessage | { error: string } {
  if (!db.restaurants.get(slug)?.settings.features.chat) return { error: "Chat is off here" };
  pruneStale();
  const from = participantByCode(slug, fromCode);
  const to = participantByCode(slug, toCode);
  if (!from || !to) return { error: "This person has left the venue" };
  if (!from.openToChat || !to.openToChat) return { error: "Both guests must be open to chat" };
  if (isBlocked(fromCode, toCode)) return { error: "This chat is blocked" };
  const clean = text.trim().slice(0, 500);
  if (!clean) return { error: "Empty message" };
  from.lastSeen = Date.now();
  const msg: ChatMessage = {
    id: rand(),
    conv: convId(from.code, to.code),
    fromCode: from.code,
    text: clean,
    ts: Date.now(),
  };
  db.messages.push(msg);
  return msg;
}

export function getChat(
  slug: string,
  meCode: string,
  withCode: string,
): { withName?: string; messages: ChatMessage[]; blocked: boolean } {
  const me = participantByCode(slug, meCode);
  if (me) me.lastSeen = Date.now();
  pruneStale();
  const other = participantByCode(slug, withCode);
  const conv = convId(meCode, withCode);
  return {
    withName: other?.name,
    messages: db.messages.filter((m) => m.conv === conv),
    blocked: isBlocked(meCode, withCode),
  };
}

export function blockChat(meCode: string, targetCode: string): void {
  const set = db.blocks.get(meCode.toUpperCase()) ?? new Set<string>();
  set.add(targetCode.toUpperCase());
  db.blocks.set(meCode.toUpperCase(), set);
}

export function listOrders(slug: string): Order[] {
  return db.orders.filter((o) => o.restaurantSlug === slug);
}

/**
 * Anonymous, aggregate social proof — "what others are ordering" — from the
 * last 24h. No guest identity is exposed; this is purely counts per item.
 */
export function getTrending(slug: string, limit = 5): { name: string; qty: number }[] {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const counts = new Map<string, number>();
  for (const o of db.orders) {
    if (o.restaurantSlug !== slug || o.createdAt < since) continue;
    for (const l of o.lines) counts.set(l.name, (counts.get(l.name) ?? 0) + l.qty);
  }
  return [...counts.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

export function getOrder(id: string): Order | undefined {
  return db.orders.find((o) => o.id === id);
}

const NEXT: Record<Order["status"], Order["status"]> = {
  received: "preparing",
  preparing: "ready",
  ready: "served",
  served: "served",
};

export function advanceOrder(id: string): Order | undefined {
  const o = db.orders.find((x) => x.id === id);
  if (o) o.status = NEXT[o.status];
  return o;
}
