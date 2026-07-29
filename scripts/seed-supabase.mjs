// Seed the demo venue into Supabase (idempotent).
// Run:  node --env-file=.env.local scripts/seed-supabase.mjs

import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SETTINGS = {
  features: { ordering: true, loyalty: true, referral: true, scratchReward: true, social: true, chat: true },
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

const MENU = [
  ["Masala Chai", "Spiced milk tea, brewed to order", 60, "Drinks"],
  ["Cold Brew Coffee", "18-hour slow steep, served over ice", 180, "Drinks"],
  ["Fresh Lime Soda", "Sweet or salted", 90, "Drinks"],
  ["Paneer Tikka", "Char-grilled cottage cheese, mint chutney", 280, "Starters"],
  ["Crispy Corn", "Tossed with chilli, garlic & herbs", 220, "Starters"],
  ["Margherita Pizza", "San Marzano tomato, basil, mozzarella", 360, "Mains"],
  ["Butter Paneer + Naan", "Creamy tomato gravy with two butter naan", 340, "Mains"],
  ["Veg Hakka Noodles", "Wok-tossed with seasonal veg", 240, "Mains"],
  ["Choco Lava Cake", "Warm, molten centre, vanilla scoop", 190, "Desserts"],
];

const die = (m, e) => { console.error("✗", m, e?.message ?? e ?? ""); process.exit(1); };

// 1) Upsert tenant.
const { data: tenant, error: tErr } = await db
  .from("tenants")
  .upsert({ slug: "demo-cafe", name: "Demo Cafe", address: "12 Brew Street", currency: "INR", settings: SETTINGS }, { onConflict: "slug" })
  .select()
  .single();
if (tErr) die("upsert tenant", tErr);
const tid = tenant.id;
console.log("✓ tenant:", tenant.slug, tid);

// 2) Reset + insert menu.
await db.from("menu_items").delete().eq("tenant_id", tid);
const { error: mErr } = await db.from("menu_items").insert(
  MENU.map(([name, description, price, category], i) => ({ tenant_id: tid, name, description, price, category, sort: i })),
);
if (mErr) die("insert menu", mErr);
console.log(`✓ menu: ${MENU.length} items`);

// 3) Reset + insert 8 tables with random tokens.
await db.from("venue_tables").delete().eq("tenant_id", tid);
const tables = Array.from({ length: 8 }, (_, i) => ({
  tenant_id: tid,
  label: String(i + 1),
  token: `t-${i + 1}-${Math.random().toString(36).slice(2, 10)}`,
}));
const { error: vErr } = await db.from("venue_tables").insert(tables);
if (vErr) die("insert tables", vErr);
console.log(`✓ tables: ${tables.length}`);

console.log("\nSeed complete. Check the Supabase dashboard → Table editor.");
