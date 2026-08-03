import Link from "next/link";
import { DEMO_SLUG, getRestaurant, listOrders } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const r = (await getRestaurant(DEMO_SLUG))!;
  const orders = await listOrders(DEMO_SLUG);
  const open = orders.filter((o) => o.status !== "served").length;

  const stats = [
    { label: "Menu items", value: r.menu.length, href: "/admin/menu" },
    { label: "Tables", value: r.tables.length, href: "/admin/tables" },
    { label: "Orders today", value: orders.length, href: "/admin/orders" },
    { label: "Open orders", value: open, href: "/admin/orders" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">{r.name}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {r.address} · Currency {r.currency}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:border-[var(--color-zap)]">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 card p-6">
        <h2 className="font-semibold">Get set up in 3 steps</h2>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex gap-3">
            <Step n={1} />
            <span>
              <Link href="/admin/menu" className="text-[var(--color-zap)] underline-offset-2 hover:underline">
                Upload your menu
              </Link>{" "}
              as a photo or PDF - ZapTable reads it into items &amp; prices.
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={2} />
            <span>
              <Link href="/admin/tables" className="text-[var(--color-zap)] underline-offset-2 hover:underline">
                Set your table count
              </Link>{" "}
              and print the QR codes for each table.
            </span>
          </li>
          <li className="flex gap-3">
            <Step n={3} />
            <span>
              Watch{" "}
              <Link href="/admin/orders" className="text-[var(--color-zap)] underline-offset-2 hover:underline">
                live orders
              </Link>{" "}
              roll in and move them received → preparing → ready → served.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xs font-semibold text-[var(--color-zap)]">
      {n}
    </span>
  );
}
