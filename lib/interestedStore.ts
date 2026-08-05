import fs from "fs";
import path from "path";
import { db, hasSupabase } from "./db/client";

export interface InterestedEmail {
  id: string;
  email: string;
  createdAt: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "interested.json");

let memoryStore: InterestedEmail[] = [];

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]), "utf-8");
    } else {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      memoryStore = JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Local storage file read fallback:", err);
  }
}

function saveDataFile() {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch (err) {
    console.warn("Local storage file write fallback:", err);
  }
}

ensureDataFile();

export async function addInterestedEmail(email: string): Promise<{ success: boolean; message: string; duplicate?: boolean }> {
  const normalized = email.trim().toLowerCase();

  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { success: false, message: "Please enter a valid email address." };
  }

  // 1. Check existing
  const existingList = await getInterestedEmails();
  const exists = existingList.some((e) => e.email.toLowerCase() === normalized);
  if (exists) {
    return { success: true, message: "You are already registered on our interest list!", duplicate: true };
  }

  const entry: InterestedEmail = {
    id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: normalized,
    createdAt: Date.now(),
  };

  memoryStore.unshift(entry);
  saveDataFile();

  // 2. Persist to Supabase if available
  if (hasSupabase()) {
    try {
      // Try dedicated table first
      const { error } = await db().from("interested_emails").insert({
        email: normalized,
        created_at: new Date(entry.createdAt).toISOString(),
      });

      if (error) {
        // Fallback to guests table if interested_emails table not yet created
        const { data: tenant } = await db().from("tenants").select("id").eq("slug", "demo-cafe").maybeSingle();
        const tenantId = tenant?.id;

        if (tenantId) {
          await db().from("guests").upsert(
            {
              tenant_id: tenantId,
              phone: `interest:${normalized}`,
              name: normalized,
              code: Math.random().toString(36).slice(2, 8).toUpperCase(),
            },
            { onConflict: "tenant_id,phone" }
          );
        }
      }
    } catch (err) {
      console.warn("Supabase save error:", err);
    }
  }

  return { success: true, message: "Thank you! Your interest has been recorded." };
}

export async function getInterestedEmails(): Promise<InterestedEmail[]> {
  ensureDataFile();

  if (hasSupabase()) {
    try {
      // 1. Try dedicated interested_emails table
      const { data, error } = await db()
        .from("interested_emails")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: String(d.id),
          email: d.email,
          createdAt: new Date(d.created_at).getTime(),
        }));
      }

      // 2. Fallback query from guests table
      const { data: fallbackGuests } = await db()
        .from("guests")
        .select("id, phone, name, created_at")
        .like("phone", "interest:%")
        .order("created_at", { ascending: false });

      if (fallbackGuests && fallbackGuests.length > 0) {
        return fallbackGuests.map((g) => ({
          id: g.id,
          email: g.name || g.phone.replace(/^interest:/, ""),
          createdAt: new Date(g.created_at).getTime(),
        }));
      }
    } catch (err) {
      console.warn("Supabase fetch error:", err);
    }
  }

  return [...memoryStore].sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteInterestedEmail(id: string): Promise<boolean> {
  ensureDataFile();
  memoryStore = memoryStore.filter((e) => e.id !== id);
  saveDataFile();

  if (hasSupabase()) {
    try {
      await db().from("interested_emails").delete().eq("id", id);
      await db().from("guests").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete error:", err);
    }
  }

  return true;
}
