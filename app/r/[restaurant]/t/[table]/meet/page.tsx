import Link from "next/link";
import { getRestaurant } from "@/lib/db/repo";
import MeetHub from "../MeetHub";

export const dynamic = "force-dynamic";

export default async function MeetPage({
  params,
}: {
  params: Promise<{ restaurant: string; table: string }>;
}) {
  const { restaurant: slug, table: tableId } = await params;
  const r = await getRestaurant(slug);

  if (!r) {
    return (
      <main className="zap-glow flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Venue not found</h1>
          <Link href="/" className="mt-4 inline-block text-sm text-[var(--color-zap)] hover:underline">
            ← Tavexa home
          </Link>
        </div>
      </main>
    );
  }

  return <MeetHub slug={slug} tableId={tableId} />;
}
