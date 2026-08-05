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

// In-memory array for hot-reloading & fast reads
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
    console.warn("Failed to initialize local interested.json file:", err);
  }
}

// Read on module load
ensureDataFile();

export async function addInterestedEmail(email: string): Promise<{ success: boolean; message: string; duplicate?: boolean }> {
  const normalized = email.trim().toLowerCase();
  
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { success: false, message: "Please enter a valid email address." };
  }

  // 1. Check local file memory
  ensureDataFile();
  const exists = memoryStore.some((e) => e.email.toLowerCase() === normalized);
  if (exists) {
    return { success: true, message: "You are already registered on our interest list!", duplicate: true };
  }

  const entry: InterestedEmail = {
    id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: normalized,
    createdAt: Date.now(),
  };

  memoryStore.unshift(entry);

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write to interested.json:", err);
  }

  // 2. Also save to Supabase if connected
  if (hasSupabase()) {
    try {
      await db().from("interested_emails").insert({
        email: normalized,
        created_at: new Date(entry.createdAt).toISOString(),
      });
    } catch (err) {
      console.warn("Supabase save interested email fallback ignored:", err);
    }
  }

  return { success: true, message: "Thank you! Your interest has been recorded." };
}

export async function getInterestedEmails(): Promise<InterestedEmail[]> {
  ensureDataFile();
  
  if (hasSupabase()) {
    try {
      const { data } = await db()
        .from("interested_emails")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        return data.map((d) => ({
          id: String(d.id),
          email: d.email,
          createdAt: new Date(d.created_at).getTime(),
        }));
      }
    } catch (err) {
      console.warn("Supabase query for interested emails failed, using local store:", err);
    }
  }

  return [...memoryStore].sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteInterestedEmail(id: string): Promise<boolean> {
  ensureDataFile();
  memoryStore = memoryStore.filter((e) => e.id !== id);

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to update interested.json after delete:", err);
  }

  if (hasSupabase()) {
    try {
      await db().from("interested_emails").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete failed:", err);
    }
  }

  return true;
}
