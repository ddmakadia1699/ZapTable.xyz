// Verifies the Supabase connection + that the schema is applied.
// Run:  node --env-file=.env.local scripts/supabase-health.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("✗ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { error, count } = await db.from("tenants").select("*", { count: "exact", head: true });

if (error) {
  if (error.code === "PGRST205" || /Could not find the table/.test(error.message)) {
    console.error("✗ Connected, but the schema isn't applied yet.");
    console.error("  Run supabase/migrations/0001_init.sql then 0002_prune_ephemeral.sql in the SQL editor.");
  } else {
    console.error("✗ DB error:", error.message);
  }
  process.exit(1);
}

console.log(`✓ Connected to Supabase. tenants table exists (${count ?? 0} rows).`);
console.log("  Ready for the Phase 2 data-layer port.");
