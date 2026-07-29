// Proves a full order round-trip against the live Supabase DB, then cleans up.
// Run:  node --env-file=.env.local scripts/verify-supabase.mjs

import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const die = (m, e) => { console.error("✗", m, e?.message ?? e ?? ""); process.exit(1); };

// Read tenant + a table + menu (the guest-load path).
const { data: tenant } = await db.from("tenants").select("id,settings").eq("slug", "demo-cafe").single();
const { count: menuCount } = await db.from("menu_items").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id);
const { data: table } = await db.from("venue_tables").select("id,label").eq("tenant_id", tenant.id).limit(1).single();
console.log(`✓ read tenant (social=${tenant.settings.features.social}), ${menuCount} menu items, table ${table.label}`);

// Create an order + lines (the checkout path).
const lines = [{ name: "Masala Chai", price: 60, qty: 2 }, { name: "Choco Lava Cake", price: 190, qty: 1 }];
const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
const { data: order, error: oErr } = await db
  .from("orders")
  .insert({ tenant_id: tenant.id, table_id: table.id, table_label: table.label, currency: "INR", total, status: "received" })
  .select()
  .single();
if (oErr) die("insert order", oErr);
const { error: lErr } = await db.from("order_lines").insert(lines.map((l) => ({ tenant_id: tenant.id, order_id: order.id, name: l.name, price: l.price, qty: l.qty })));
if (lErr) die("insert lines", lErr);
console.log(`✓ created order ${order.id.slice(0, 8)} — total ₹${order.total}, status ${order.status}`);

// Read it back with lines (the KDS / status path).
const { data: readBack } = await db.from("orders").select("status,total,order_lines(name,qty)").eq("id", order.id).single();
console.log(`✓ read back: ${readBack.order_lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}`);

// Advance status (the KDS button).
const { data: advanced } = await db.from("orders").update({ status: "preparing" }).eq("id", order.id).select("status").single();
console.log(`✓ advanced status: received → ${advanced.status}`);

// Cleanup so we don't leave test data.
await db.from("orders").delete().eq("id", order.id);
console.log("✓ cleaned up test order\n\nFull CRUD verified against live Supabase. 🎉");
