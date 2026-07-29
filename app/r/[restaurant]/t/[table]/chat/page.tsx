import Link from "next/link";
import ChatRoom from "./ChatRoom";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurant: string; table: string }>;
  searchParams: Promise<{ with?: string }>;
}) {
  const { restaurant: slug, table: tableId } = await params;
  const { with: withCode } = await searchParams;

  if (!withCode) {
    return (
      <main className="zap-glow flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">No chat selected</h1>
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

  return <ChatRoom slug={slug} tableId={tableId} withCode={withCode.toUpperCase()} />;
}
