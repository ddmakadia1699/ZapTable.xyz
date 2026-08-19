"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import type { MenuItem, OrderStatus } from "@/lib/types";

const LS_KEY = "tavexa:guest";

const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "received 🧾",
  preparing: "being prepared 🔥",
  ready: "ready to serve ✅",
  served: "served 🍽️",
};

interface SavedGuest {
  phone: string;
  name?: string;
}

interface Recognition {
  name?: string;
  stamps: number;
  goal: number;
  activeRewards: number;
}

export default function GuestOrder({
  slug,
  restaurantName,
  currency,
  tableId,
  tableLabel,
  menu,
  social,
}: {
  slug: string;
  restaurantName: string;
  currency: string;
  tableId: string;
  tableLabel: string;
  menu: MenuItem[];
  social: boolean;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [known, setKnown] = useState<Recognition | null>(null);
  const [ref, setRef] = useState("");
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<{ id: string; status: OrderStatus } | null>(null);
  const [trending, setTrending] = useState<{ name: string; qty: number }[]>([]);

  const orderKey = `tavexa:order:${slug}:${tableId}`;

  // Recognition: if we've seen this guest on this device, prefill + greet.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedGuest;
        if (saved.phone) setPhone(saved.phone);
        if (saved.name) setName(saved.name);
        fetch(`/api/guest?slug=${slug}&phone=${encodeURIComponent(saved.phone)}`)
          .then((r) => (r.status === 200 ? r.json() : null))
          .then((d) => d?.guest && setKnown(d.guest))
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }

    // Invited via a friend's link? Pick up ?ref= and greet the inviter.
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) {
      setRef(code.toUpperCase());
      fetch(`/api/guest?slug=${slug}&code=${encodeURIComponent(code)}`)
        .then((r) => (r.status === 200 ? r.json() : null))
        .then((d) => d?.referrer && setReferrerName(d.referrer.name ?? "A friend"))
        .catch(() => {});
    }
  }, [slug]);

  // Persistent order tracking: if this table has an active order saved on this
  // device, keep its live status so the guest can always tap back to the tracker.
  useEffect(() => {
    let alive = true;
    const id = localStorage.getItem(orderKey);
    if (!id) return;
    async function poll() {
      const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      if (!alive) return;
      if (res.status === 404) {
        localStorage.removeItem(orderKey);
        setActiveOrder(null);
        return;
      }
      const data = await res.json();
      const status: OrderStatus = data.order.status;
      setActiveOrder({ id: id!, status });
      if (status === "served") {
        localStorage.removeItem(orderKey); // done - stop tracking next reload
      }
    }
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [orderKey]);

  // "What others are ordering" - anonymous, aggregate social proof.
  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch(`/api/trending?slug=${slug}`, { cache: "no-store" });
      if (!alive) return;
      const data = await res.json();
      setTrending(data.items ?? []);
    }
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [slug]);

  const menuByName = useMemo(() => new Map(menu.map((m) => [m.name, m])), [menu]);

  const categories = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const it of menu) {
      if (!it.available) continue;
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return [...map.entries()];
  }, [menu]);

  const itemsById = useMemo(() => new Map(menu.map((m) => [m.id, m])), [menu]);

  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const it = itemsById.get(id)!;
      return { itemId: id, name: it.name, price: it.price, qty };
    });

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function setQty(id: string, qty: number) {
    setCart((c) => ({ ...c, [id]: Math.max(0, qty) }));
  }

  async function placeOrder() {
    if (phone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      // Payment is stubbed for the MVP scaffold - a real gateway (UPI/Razorpay,
      // Stripe) plugs in right here before the order is created.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, tableId, lines, phone, name, ref: ref || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not place order");
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ phone, name } satisfies SavedGuest));
        localStorage.setItem(orderKey, data.order.id); // remember for persistent tracking
      } catch {
        /* ignore */
      }
      router.push(`/r/${slug}/t/${tableId}/status?order=${data.order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place order");
      setPlacing(false);
    }
  }

  const stampsLeft = known ? Math.max(0, known.goal - known.stamps) : 0;

  return (
    <main className="min-h-screen pb-28">
      {/* Persistent tracker - always one tap back to "what I ordered & where it is". */}
      {activeOrder && activeOrder.status !== "served" && (
        <Link
          href={`/r/${slug}/t/${tableId}/status?order=${activeOrder.id}`}
          className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-[var(--color-zap)] px-5 py-2.5 text-sm font-semibold text-[#04140c]"
        >
          <span>🍳 Your order is {STATUS_LABEL[activeOrder.status]}</span>
          <span className="underline underline-offset-2">Track →</span>
        </Link>
      )}

      <header className="zap-glow border-b border-[var(--color-line)] px-5 py-5">
        <div className="text-xs text-[var(--color-muted)]">
          <span aria-hidden>⚡</span> Tavexa · Table {tableLabel}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          {known?.name ? `Welcome back, ${known.name} 👋` : restaurantName}
        </h1>
        {known ? (
          <p className="text-sm text-[var(--color-zap)]">
            {known.activeRewards > 0 && `You have ${known.activeRewards} reward${known.activeRewards > 1 ? "s" : ""} waiting · `}
            {stampsLeft === 0
              ? "Your loyalty card is full - order to claim 🎁"
              : `${stampsLeft} more visit${stampsLeft > 1 ? "s" : ""} to a free dessert 🍰`}
          </p>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Order right from your phone - no app needed.</p>
        )}
        {(referrerName || ref) && !known && (
          <div className="chip mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-zap)]">
            🎁 {referrerName ? `${referrerName} invited you` : "You were invited"} - order to unlock a welcome gift for you both
          </div>
        )}
      </header>

      {/* Social is independent of ordering - anyone here can join with just a name. */}
      {social && (
        <Link
          href={`/r/${slug}/t/${tableId}/meet`}
          className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-5 py-3 text-sm transition hover:bg-[var(--color-surface)]"
        >
          <span>
            👋 <span className="font-medium">Meet &amp; chat with people here</span>
            <span className="text-[var(--color-muted)]"> - no order needed</span>
          </span>
          <span className="text-[var(--color-zap)]">Open →</span>
        </Link>
      )}

      {trending.length > 0 && (
        <div className="border-b border-[var(--color-line)] px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            🔥 Popular here today
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {trending.map((t) => {
              const it = menuByName.get(t.name);
              const addable = it?.available;
              return (
                <button
                  key={t.name}
                  disabled={!addable}
                  onClick={() => it && setQty(it.id, (cart[it.id] ?? 0) + 1)}
                  className="chip flex flex-none items-center gap-2 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  <span className="whitespace-nowrap">{t.name}</span>
                  <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                    {t.qty} ordered{addable ? " · +" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-5 py-6">
        {categories.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">
            The menu isn&apos;t ready yet. Please check back shortly.
          </p>
        )}
        {categories.map(([cat, items]) => (
          <section key={cat} className="mb-7">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              {cat}
            </h2>
            <ul className="mt-3 space-y-3">
              {items.map((it) => {
                const qty = cart[it.id] ?? 0;
                return (
                  <li key={it.id} className="card flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="font-medium">{it.name}</div>
                      {it.description && (
                        <div className="truncate text-sm text-[var(--color-muted)]">{it.description}</div>
                      )}
                      <div className="mt-1 text-sm font-semibold text-[var(--color-zap)]">
                        {money(it.price, currency)}
                      </div>
                    </div>
                    {qty === 0 ? (
                      <button onClick={() => setQty(it.id, 1)} className="btn-zap flex-none px-4 py-2 text-sm">
                        Add
                      </button>
                    ) : (
                      <div className="flex flex-none items-center gap-3 rounded-lg bg-[var(--color-surface-2)] px-2 py-1">
                        <button onClick={() => setQty(it.id, qty - 1)} className="px-2 text-lg leading-none" aria-label="Decrease">
                          −
                        </button>
                        <span className="w-4 text-center text-sm font-semibold">{qty}</span>
                        <button onClick={() => setQty(it.id, qty + 1)} className="px-2 text-lg leading-none" aria-label="Increase">
                          +
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Sticky cart bar */}
      {count > 0 && !checkoutOpen && (
        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 px-5 py-4 backdrop-blur">
          <button
            onClick={() => setCheckoutOpen(true)}
            className="btn-zap flex w-full items-center justify-between px-5 py-3"
          >
            <span>{`Review & pay · ${count} item${count > 1 ? "s" : ""}`}</span>
            <span>{money(total, currency)}</span>
          </button>
        </div>
      )}

      {/* Checkout sheet - identity capture */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-10 flex items-end bg-black/50" onClick={() => !placing && setCheckoutOpen(false)}>
          <div
            className="w-full rounded-t-2xl border-t border-[var(--color-line)] bg-[var(--color-surface)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-line)]" />
            <h2 className="text-lg font-semibold">Almost there</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              We&apos;ll text your receipt and track your rewards - no app, no spam.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-[var(--color-muted)]">Name (optional)</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--color-muted)]">Phone / WhatsApp</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="+91 90000 00000"
                  className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5"
                />
              </label>
              {!known && (
                <label className="block text-sm">
                  <span className="text-[var(--color-muted)]">Friend&apos;s invite code (optional)</span>
                  <input
                    value={ref}
                    onChange={(e) => setRef(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC234"
                    className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 uppercase tracking-wider"
                  />
                  {referrerName && (
                    <span className="mt-1 block text-xs text-[var(--color-zap)]">
                      ✓ Invited by {referrerName} - you both get a reward
                    </span>
                  )}
                </label>
              )}

            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted)]">
                {count} item{count > 1 ? "s" : ""}
              </span>
              <span className="text-lg font-semibold">{money(total, currency)}</span>
            </div>

            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

            <button onClick={placeOrder} disabled={placing} className="btn-zap mt-3 w-full px-5 py-3">
              {placing ? "Placing…" : "Place order & pay"}
            </button>
            <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
              Payment is simulated in this scaffold - UPI / card checkout plugs in here.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
