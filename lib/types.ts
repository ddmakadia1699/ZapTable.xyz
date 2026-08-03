// Core domain types for ZapTable.
// Kept deliberately small for the MVP scaffold - extend as features land.

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number; // in the restaurant's currency, major units (e.g. 12.50)
  category: string;
  available: boolean;
}

export interface Table {
  id: string; // unique token embedded in the QR URL
  label: string; // human label, e.g. "12"
}

export interface Restaurant {
  slug: string; // URL slug, e.g. "demo-cafe"
  name: string;
  address?: string;
  currency: string; // ISO 4217, e.g. "INR", "USD"
  menu: MenuItem[];
  tables: Table[];
  settings: Settings; // owner-controlled feature flags + reward/streak/level config
}

// Admin-controlled configuration. Mirrors the `tenants.settings` JSONB column
// (see supabase/migrations/0001_init.sql) so it ports straight to the DB.
export interface Settings {
  features: {
    ordering: boolean;
    loyalty: boolean;
    referral: boolean;
    scratchReward: boolean;
    social: boolean;
    chat: boolean;
  };
  loyalty: { stampGoal: number; headStart: number; rewardTtlDays: number };
  scratch: { amount: number; amountOdds: number; freeItemOdds: number };
  referral: { value: number; level2Value: number };
  streak: { enabled: boolean };
  levels: { name: string; minVisits: number }[];
  social: { sessionTtlMinutes: number; minAge: number };
}

export type OrderStatus = "received" | "preparing" | "ready" | "served";

export interface OrderLine {
  itemId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  restaurantSlug: string;
  tableId: string;
  tableLabel: string;
  lines: OrderLine[];
  total: number;
  currency: string;
  status: OrderStatus;
  createdAt: number; // epoch ms
  guestPhone?: string; // identity captured at checkout, if any
  rewardId?: string; // the scratch reward generated for this order
}

// A perk the guest can use on a future visit. The "variable reward" the guest
// scratches to reveal, or the free item earned by completing a loyalty card.
export type RewardKind = "amount" | "freeItem" | "none";

export interface Reward {
  id: string;
  label: string; // e.g. "₹100 off your next visit"
  kind: RewardKind;
  value?: number; // for kind "amount"
  expiresAt: number; // epoch ms - loss aversion: rewards expire
  redeemed: boolean;
}

// A recognised, returning guest - keyed by phone within a restaurant.
export interface Guest {
  phone: string;
  name?: string;
  restaurantSlug: string;
  visits: number;
  stamps: number; // current loyalty stamps toward the goal
  stampGoal: number; // stamps needed for the free item
  rewards: Reward[];
  code: string; // this guest's shareable invite code
  referredBy?: string; // invite code of the friend who brought them in
  referrals: number; // friends this guest has brought in
  createdAt: number;
  lastVisitAt: number;
}

// The social layer is INDEPENDENT of ordering: anyone who scans can join "meet &
// chat" with just a name - no checkout required. A Participant is keyed by a
// device session id (sid), so non-ordering guests can take part too.
export interface Participant {
  sid: string; // device/session id, generated client-side
  slug: string;
  name: string;
  code: string; // public id used for chat & presence
  igHandle?: string; // optional IG to share
  openToChat: boolean; // opted into 1:1 chat
  createdAt: number;
  lastSeen: number; // refreshed on activity - drives "here now"
}

// A single 1:1 chat message between two opted-in participants at a venue.
export interface ChatMessage {
  id: string;
  conv: string; // conversation id (sorted pair of participant codes)
  fromCode: string; // sender's public code
  text: string;
  ts: number;
}

// Loyalty snapshot returned to the guest's screens.
export interface LoyaltySnapshot {
  name?: string;
  visits: number;
  stamps: number;
  goal: number;
  startedWithHeadStart: boolean;
  loyaltyJustCompleted: boolean;
  code: string; // this guest's invite code, to share
  referrals: number; // how many friends they've brought in
  referredCredited?: boolean; // this order credited them as a referee
  referralName?: string; // the friend who invited them (if any)
}

// Shape returned by the menu-ingestion (PDF/photo -> menu) step.
export interface ParsedMenuItem {
  name: string;
  description?: string;
  price: number;
  category: string;
}
