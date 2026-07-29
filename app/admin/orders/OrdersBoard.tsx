"use client";

import { useCallback, useEffect, useState } from "react";
import { money } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const FLOW: OrderStatus[] = ["received", "preparing", "ready", "served"];

const NEXT_LABEL: Record<OrderStatus, string | null> = {
  received: "Start preparing",
  preparing: "Mark ready",
  ready: "Mark served",
  served: null,
};

const BADGE: Record<OrderStatus, string> = {
  received: "bg-amber-500/15 text-amber-300",
  preparing: "bg-sky-500/15 text-sky-300",
  ready: "bg-emerald-500/15 text-emerald-300",
  served: "bg-zinc-500/15 text-zinc-400",
};

export default function OrdersBoard({ slug }: { slug: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders?slug=${slug}`, { cache: "no-store" });
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoaded(true);
  }, [slug]);

  useEffect(() => {
    load();
    const id = setInterval(load, 3000); // simple polling; WebSockets on the roadmap
    return () => clearInterval(id);
  }, [load]);

  async function advance(id: string) {
    await fetch(`/api/orders/${id}`, { method: "PATCH" });
    load();
  }

  const active = orders.filter((o) => o.status !== "served");
  const done = orders.filter((o) => o.status === "served");

  if (loaded && orders.length === 0) {
    return (
      <div className="card mt-6 p-10 text-center text-[var(--color-muted)]">
        No orders yet. Open a{" "}
        <span className="text-[var(--color-zap)]">guest table link</span> and place one —
        it&apos;ll appear here within a few seconds.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      <Column title="Active" orders={active} onAdvance={advance} />
      {done.length > 0 && <Column title="Served" orders={done} onAdvance={advance} dim />}
    </div>
  );
}

function Column({
  title,
  orders,
  onAdvance,
  dim,
}: {
  title: string;
  orders: Order[];
  onAdvance: (id: string) => void;
  dim?: boolean;
}) {
  if (orders.length === 0 && title === "Active") {
    return (
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Nothing active right now.</p>
      </div>
    );
  }
  return (
    <div className={dim ? "opacity-60" : ""}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {title}
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => {
          const nextLabel = NEXT_LABEL[o.status];
          return (
            <div key={o.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Table {o.tableLabel}</div>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${BADGE[o.status]}`}>
                  {o.status}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.lines.map((l) => (
                  <li key={l.itemId} className="flex justify-between gap-3">
                    <span>
                      <span className="text-[var(--color-muted)]">{l.qty}×</span> {l.name}
                    </span>
                    <span className="text-[var(--color-muted)]">{money(l.price * l.qty, o.currency)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line)] pt-3">
                <span className="font-semibold">{money(o.total, o.currency)}</span>
                {nextLabel && (
                  <button onClick={() => onAdvance(o.id)} className="btn-zap px-3 py-1.5 text-sm">
                    {nextLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
