import Link from "next/link";
import OrderStatus from "./OrderStatus";

export const dynamic = "force-dynamic";

export default async function StatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurant: string; table: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { restaurant: slug, table: tableId } = await params;
  const { order } = await searchParams;

  if (!order) {
    return (
      <main className="zap-glow flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">No order to track</h1>
          <Link
            href={`/r/${slug}/t/${tableId}`}
            className="mt-4 inline-block text-sm text-[var(--color-zap)] hover:underline"
          >
            ← Back to the menu
          </Link>
        </div>
      </main>
    );
  }

  return <OrderStatus orderId={order} backHref={`/r/${slug}/t/${tableId}`} />;
}
