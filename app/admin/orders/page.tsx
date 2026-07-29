import { DEMO_SLUG } from "@/lib/db/repo";
import OrdersBoard from "./OrdersBoard";

export default function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Live orders</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Updates every few seconds. Move each ticket received → preparing → ready → served.
      </p>
      <OrdersBoard slug={DEMO_SLUG} />
    </div>
  );
}
