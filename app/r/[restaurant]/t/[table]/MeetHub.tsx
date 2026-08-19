"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSid } from "@/lib/session";
import type { SocialPerson } from "@/lib/store";

interface Presence {
  enabled: boolean;
  joined: boolean;
  shared: boolean;
  me: SocialPerson | null;
  meOpenToChat: boolean;
  people: SocialPerson[];
}

export default function MeetHub({ slug, tableId }: { slug: string; tableId: string }) {
  const [sid, setSid] = useState("");
  const [data, setData] = useState<Presence | null>(null);
  const [name, setName] = useState("");
  const [ig, setIg] = useState("");
  const [openToChat, setOpenToChat] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setSid(getSid());
    try {
      const raw = localStorage.getItem("tavexa:guest");
      if (raw) setName((JSON.parse(raw) as { name?: string }).name ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    if (!sid) return;
    const res = await fetch(`/api/social?slug=${slug}&sid=${sid}`, { cache: "no-store" });
    const d: Presence = await res.json();
    setData(d);
    if (d.me?.name && !name) setName(d.me.name);
    if (d.me?.handle && !ig) setIg(d.me.handle);
  }, [sid, slug, name, ig]);

  useEffect(() => {
    if (!sid) return;
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [sid, load]);

  async function join() {
    if (!name.trim()) {
      setError("Please add a name");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, sid, name, igHandle: ig || undefined, openToChat }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not join");
      localStorage.setItem(`tavexa:me:${slug}`, d.code); // my public id for chat
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
    } finally {
      setSaving(false);
    }
  }

  const backHref = `/r/${slug}/t/${tableId}`;

  const shell = (children: React.ReactNode) => (
    <main className="zap-glow min-h-screen px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3 text-sm">
          <Link href={backHref} className="text-[var(--color-muted)]">
            ←
          </Link>
          <span className="font-semibold">Meet &amp; chat here 👋</span>
        </div>
        {children}
      </div>
    </main>
  );

  if (data && !data.enabled) {
    return shell(
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        This venue hasn&apos;t turned on meet &amp; chat.
      </p>,
    );
  }

  // Join / edit form - shown until you're visible (open to chat or shared IG).
  if (!data || !data.shared || editing) {
    return shell(
      <div className="card mt-6 p-5">
        <h1 className="text-lg font-semibold">Say you&apos;re here</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Join with just a first name - no order needed. You&apos;ll see others here who joined too. Opt-in &amp; 18+.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">First name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sam"
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">Instagram (optional)</span>
            <div className="mt-1 flex items-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3">
              <span className="text-[var(--color-muted)]">@</span>
              <input
                value={ig}
                onChange={(e) => setIg(e.target.value.replace(/[^A-Za-z0-9._]/g, ""))}
                placeholder="yourhandle"
                className="w-full bg-transparent py-2.5 pl-1 outline-none"
              />
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3 text-sm">
            <input
              type="checkbox"
              checked={openToChat}
              onChange={(e) => setOpenToChat(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-zap)]"
            />
            <span>
              <span className="font-medium">Open to chat in-app</span>
              <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                First names only - never your number. Block or report anyone, anytime.
              </span>
            </span>
          </label>
        </div>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button onClick={join} disabled={saving} className="btn-zap mt-4 w-full px-5 py-3">
          {saving ? "Joining…" : data?.joined ? "Update" : "Join"}
        </button>
        {!openToChat && !ig && (
          <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
            Add Instagram or tick &ldquo;open to chat&rdquo; so others can connect with you.
          </p>
        )}
      </div>,
    );
  }

  // You're in - show who else is here.
  return shell(
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted)]">
          You&apos;re visible as <span className="text-[var(--color-zap)]">{data.me?.name}</span>
        </p>
        <button onClick={() => setEditing(true)} className="chip px-3 py-1.5 text-xs">
          Edit
        </button>
      </div>

      {data.people.length === 0 ? (
        <div className="card mt-3 p-6 text-center text-sm text-[var(--color-muted)]">
          No one else is here yet 🙂 Hang tight - you&apos;ll see people as they join.
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.people.map((p) => (
            <li key={p.code} className="card flex items-center justify-between gap-3 p-4">
              <span className="truncate">
                {p.name}
                {p.handle && <span className="text-[var(--color-zap)]"> · @{p.handle}</span>}
              </span>
              <span className="flex flex-none items-center gap-2">
                {data.meOpenToChat && p.openToChat && (
                  <Link
                    href={`/r/${slug}/t/${tableId}/chat?with=${p.code}`}
                    className="chip px-3 py-1.5 text-xs text-[var(--color-zap)]"
                  >
                    Chat
                  </Link>
                )}
                {p.handle && (
                  <a
                    href={`https://instagram.com/${p.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="chip px-3 py-1.5 text-xs"
                  >
                    IG ↗
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>,
  );
}
