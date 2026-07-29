import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { DEMO_SLUG, getRestaurant, setTableCount } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

// Server action: regenerate the table set from a new count.
async function updateTables(formData: FormData) {
  "use server";
  const count = Number(formData.get("count"));
  if (Number.isFinite(count) && count > 0) {
    await setTableCount(DEMO_SLUG, Math.floor(count));
    revalidatePath("/admin/tables");
  }
}

export default async function TablesPage() {
  const r = (await getRestaurant(DEMO_SLUG))!;

  const qrs = await Promise.all(
    r.tables.map(async (t) => {
      const url = `${baseUrl()}/r/${r.slug}/t/${t.id}`;
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#0a0b0d", light: "#ffffff" } });
      return { ...t, url, dataUrl };
    }),
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tables &amp; QR codes</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Each table gets a unique QR. Print them on table tents or stickers —
            scanning opens the guest menu for that table.
          </p>
        </div>
        <form action={updateTables} className="flex items-end gap-2">
          <label className="text-sm">
            <span className="block text-[var(--color-muted)]">Number of tables</span>
            <input
              type="number"
              name="count"
              min={1}
              max={200}
              defaultValue={r.tables.length}
              className="mt-1 w-28 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2"
            />
          </label>
          <button type="submit" className="btn-zap px-4 py-2">
            Generate
          </button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {qrs.map((t) => (
          <div key={t.id} className="card flex flex-col items-center p-4 text-center">
            <div className="text-sm text-[var(--color-muted)]">Table</div>
            <div className="text-lg font-semibold">{t.label}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.dataUrl} alt={`QR for table ${t.label}`} className="mt-2 rounded-lg" width={160} height={160} />
            <a
              href={t.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 truncate text-xs text-[var(--color-zap)] hover:underline"
            >
              open link ↗
            </a>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        QR target base URL is <code className="text-[var(--color-zap)]">{baseUrl()}</code> — set{" "}
        <code className="text-[var(--color-zap)]">NEXT_PUBLIC_BASE_URL</code> for production. A
        downloadable print-ready PDF of all codes is on the roadmap.
      </p>
    </div>
  );
}
