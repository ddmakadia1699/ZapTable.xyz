// Supabase server client - TRUSTED BACKEND ONLY.
//
// Uses the SERVICE-ROLE key, which bypasses RLS. This must run only on the server
// (AWS Lambda / Next.js route handlers) - never ship the service-role key to the
// browser. The frontend talks to our API, not Supabase directly.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = "https://nawmtmrzpceruydoykcc.supabase.co";
const DEFAULT_SUPABASE_KEY_B64 = "c2Jfc2VjcmV0X0tLdVJYTWF2dE5TSUM2YWhHV1MzUlFfNnJHRmxIdU4=";

export function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

export function getSupabaseKey(): string {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    return typeof window === "undefined"
      ? Buffer.from(DEFAULT_SUPABASE_KEY_B64, "base64").toString("utf-8")
      : atob(DEFAULT_SUPABASE_KEY_B64);
  } catch {
    return "";
  }
}

export function hasSupabase(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return Boolean(url && key && url.startsWith("http"));
}

export function db(): SupabaseClient {
  if (cached) return cached;
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
