// Supabase server client - TRUSTED BACKEND ONLY.
//
// Uses the SERVICE-ROLE key, which bypasses RLS. This must run only on the server
// (AWS Lambda / Next.js route handlers) - never ship the service-role key to the
// browser. The frontend talks to our API, not Supabase directly.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function hasSupabase(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_URL.startsWith("http")
  );
}

export function db(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
