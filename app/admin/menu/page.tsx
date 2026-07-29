import { DEMO_SLUG, getRestaurant } from "@/lib/db/repo";
import { money } from "@/lib/format";
import type { MenuItem } from "@/lib/types";
import MenuUpload from "./MenuUpload";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const r = (await getRestaurant(DEMO_SLUG))!;

  // Group items by category, preserving first-seen order.
  const byCategory = new Map<string, MenuItem[]>();
  for (const it of r.menu) {
    const list = byCategory.get(it.category) ?? [];
    list.push(it);
    byCategory.set(it.category, list);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <div>
        <MenuUpload slug={r.slug} />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Menu</h1>
          <span className="text-sm text-[var(--color-muted)]">{r.menu.length} items</span>
        </div>

        <div className="mt-4 space-y-6">
          {[...byCategory.entries()].map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                {cat}
              </h2>
              <ul className="mt-2 divide-y divide-[var(--color-line)] overflow-hidden card">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="font-medium">{it.name}</div>
                      {it.description && (
                        <div className="text-sm text-[var(--color-muted)]">{it.description}</div>
                      )}
                    </div>
                    <div className="whitespace-nowrap font-medium">
                      {money(it.price, r.currency)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
