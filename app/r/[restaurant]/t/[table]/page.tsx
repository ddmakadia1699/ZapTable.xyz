import Link from "next/link";
import { getRestaurant } from "@/lib/db/repo";
import GuestOrder from "./GuestOrder";

export const dynamic = "force-dynamic";

export default async function GuestTablePage({
  params,
}: {
  params: Promise<{ restaurant: string; table: string }>;
}) {
  const { restaurant: slug, table: tableId } = await params;
  const r = await getRestaurant(slug);
  const table = r?.tables.find((t) => t.id === tableId);

  if (!r || !table) {
    return (
      <main className="zap-glow flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <div className="text-4xl" aria-hidden>
            🔍
          </div>
          <h1 className="mt-4 text-xl font-semibold">Table not found</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            This QR code isn&apos;t valid anymore. Ask staff for a fresh one.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-[var(--color-zap)] hover:underline">
            ← Tavexa home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <GuestOrder
      slug={r.slug}
      restaurantName={r.name}
      currency={r.currency}
      tableId={table.id}
      tableLabel={table.label}
      menu={r.menu}
      social={r.settings.features.social}
    />
  );
}
