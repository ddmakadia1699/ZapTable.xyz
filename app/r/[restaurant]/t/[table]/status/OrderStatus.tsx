"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import type { LoyaltySnapshot, Order, OrderStatus as Status, Reward } from "@/lib/types";

const STEPS: { key: Status; label: string; icon: string }[] = [
  { key: "received", label: "Order received", icon: "🧾" },
  { key: "preparing", label: "Preparing in the kitchen", icon: "🔥" },
  { key: "ready", label: "Ready", icon: "✅" },
  { key: "served", label: "Served — enjoy!", icon: "🍽️" },
];

interface Bundle {
  order: Order;
  reward?: Reward;
  loyalty?: LoyaltySnapshot;
}

export default function OrderStatus({ orderId, backHref }: { orderId: string; backHref: string }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!alive) return;
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setBundle(data);
    }
    load();
    const id = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [orderId]);

  if (notFound) {
    return (
      <main className="zap-glow flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Order not found</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">It may have cleared on a server restart.</p>
          <Link href={backHref} className="mt-4 inline-block text-sm text-[var(--color-zap)] hover:underline">
            ← Back to the menu
          </Link>
        </div>
      </main>
    );
  }

  const order = bundle?.order ?? null;
  const currentIndex = order ? STEPS.findIndex((s) => s.key === order.status) : -1;

  return (
    <main className="zap-glow min-h-screen px-5 py-10">
      <div className="mx-auto max-w-md">
        <div className="text-xs text-[var(--color-muted)]">
          <span aria-hidden>⚡</span> ZapTable {order ? `· Table ${order.tableLabel}` : ""}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          {bundle?.loyalty?.name ? `Thanks, ${bundle.loyalty.name}!` : "Your order"}
        </h1>

        {/* Referral just credited — celebrate both sides. */}
        {bundle?.loyalty?.referredCredited && (
          <div className="card mt-6 border-[var(--color-zap)] p-4 text-sm">
            🎁 <span className="font-semibold text-[var(--color-zap)]">Welcome gift unlocked!</span> You
            {bundle.loyalty.referralName ? ` and ${bundle.loyalty.referralName}` : " and your friend"} both
            earned a reward for your next visit.
          </div>
        )}

        {/* Reward — the post-payment peak. Tap to reveal (variable reward). */}
        {bundle?.reward && <ScratchReward reward={bundle.reward} />}

        {/* Loyalty progress — goal-gradient + head start. */}
        {bundle?.loyalty && <LoyaltyCard loyalty={bundle.loyalty} />}

        {/* Referral — the loop. Share your code; you both earn. */}
        {bundle?.loyalty && order && (
          <InviteCard loyalty={bundle.loyalty} slug={order.restaurantSlug} tableId={order.tableId} />
        )}

        {/* Social is independent of ordering — link out to the meet & chat hub. */}
        {order && (
          <Link
            href={`/r/${order.restaurantSlug}/t/${order.tableId}/meet`}
            className="card mt-4 flex items-center justify-between gap-3 p-5 transition hover:border-[var(--color-zap)]"
          >
            <span>
              <span className="font-semibold">Meet &amp; chat people here 👋</span>
              <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
                Say hi to others at the venue — no order needed.
              </span>
            </span>
            <span className="flex-none text-[var(--color-zap)]">Open →</span>
          </Link>
        )}

        <ol className="mt-8 space-y-4">
          {STEPS.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={step.key} className="flex items-center gap-4">
                <span
                  className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-lg transition ${
                    active
                      ? "bg-[var(--color-zap)] text-[#04140c]"
                      : done
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
                  }`}
                >
                  {done ? "✓" : step.icon}
                </span>
                <span className={active ? "font-semibold" : done ? "" : "text-[var(--color-muted)]"}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>

        {order && (
          <div className="card mt-8 p-5">
            <div className="text-sm font-semibold text-[var(--color-muted)]">Order summary</div>
            <ul className="mt-3 space-y-1 text-sm">
              {order.lines.map((l) => (
                <li key={l.itemId} className="flex justify-between gap-3">
                  <span>
                    <span className="text-[var(--color-muted)]">{l.qty}×</span> {l.name}
                  </span>
                  <span className="text-[var(--color-muted)]">{money(l.price * l.qty, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-[var(--color-line)] pt-3 font-semibold">
              <span>Total</span>
              <span>{money(order.total, order.currency)}</span>
            </div>
          </div>
        )}

        <Link href={backHref} className="mt-6 inline-block text-sm text-[var(--color-zap)] hover:underline">
          + Order more
        </Link>
      </div>
    </main>
  );
}

function ScratchReward({ reward }: { reward: Reward }) {
  const [revealed, setRevealed] = useState(false);
  const isPrize = reward.kind !== "none";
  const days = Math.max(0, Math.ceil((reward.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));

  return (
    <div className="card mt-6 overflow-hidden">
      <div className="relative p-6 text-center">
        <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">A little thank-you</div>
        <div className="mt-2 min-h-[3rem]">
          {revealed ? (
            <div>
              <div className={`text-lg font-semibold ${isPrize ? "text-[var(--color-zap)]" : ""}`}>
                {reward.label}
              </div>
              {isPrize && (
                <div className="mt-1 text-xs text-amber-300">⏳ Expires in {days} day{days !== 1 ? "s" : ""} — see you soon!</div>
              )}
            </div>
          ) : (
            <div className="text-lg font-semibold text-[var(--color-muted)]">🎁 You&apos;ve unlocked a surprise</div>
          )}
        </div>

        {!revealed && (
          <button onClick={() => setRevealed(true)} className="btn-zap mt-4 px-5 py-2.5">
            Tap to reveal
          </button>
        )}
      </div>
    </div>
  );
}

function InviteCard({
  loyalty,
  slug,
  tableId,
}: {
  loyalty: LoyaltySnapshot;
  slug: string;
  tableId: string;
}) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/r/${slug}/t/${tableId}?ref=${loyalty.code}`;
  const msg = `Order at our table on ZapTable with my code ${loyalty.code} and we both get a reward 🎁 ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the link is still visible to copy manually */
    }
  }

  return (
    <div className="card mt-4 p-5">
      <div className="text-sm font-semibold">Invite a friend — you both win</div>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        When a friend orders with your code, you <span className="text-[var(--color-zap)]">both</span> get a
        reward. If they bring a friend too, you earn again — the chain keeps going.
      </p>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3">
        <span className="text-lg font-semibold tracking-[0.2em]">{loyalty.code}</span>
        <button onClick={copy} className="chip px-3 py-1.5 text-xs">
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
        target="_blank"
        rel="noreferrer"
        className="btn-zap mt-3 flex w-full items-center justify-center gap-2 px-5 py-2.5"
      >
        Share on WhatsApp
      </a>

      {loyalty.referrals > 0 && (
        <p className="mt-3 text-xs text-[var(--color-zap)]">
          🙌 You&apos;ve brought in {loyalty.referrals} {loyalty.referrals === 1 ? "friend" : "friends"} so far.
        </p>
      )}
    </div>
  );
}

function LoyaltyCard({ loyalty }: { loyalty: LoyaltySnapshot }) {
  const { stamps, goal, startedWithHeadStart, loyaltyJustCompleted } = loyalty;
  const left = Math.max(0, goal - stamps);
  const pct = Math.min(100, Math.round((stamps / goal) * 100));

  return (
    <div className="card mt-4 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Loyalty card</div>
        <div className="text-xs text-[var(--color-muted)]">
          {stamps}/{goal} stamps
        </div>
      </div>

      {/* stamps row */}
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: goal }, (_, i) => (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
              i < stamps
                ? "bg-[var(--color-zap)] text-[#04140c]"
                : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
            }`}
          >
            {i < stamps ? "★" : i + 1}
          </span>
        ))}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div className="h-full rounded-full bg-[var(--color-zap)] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-3 text-sm">
        {loyaltyJustCompleted ? (
          <span className="font-semibold text-[var(--color-zap)]">🎉 Card complete — a free dessert is waiting on your next visit!</span>
        ) : left === 0 ? (
          <span className="font-semibold text-[var(--color-zap)]">You&apos;re one order from a free dessert 🍰</span>
        ) : (
          <>
            <span className="font-semibold text-[var(--color-zap)]">{left} more visit{left > 1 ? "s" : ""}</span>{" "}
            <span className="text-[var(--color-muted)]">to a free dessert 🍰</span>
          </>
        )}
      </p>

      {startedWithHeadStart && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">We started you off with 2 free stamps. Welcome to the club ⭐</p>
      )}
    </div>
  );
}
