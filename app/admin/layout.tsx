import Link from "next/link";
import AdminNav from "./AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="border-b border-[var(--color-line)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span aria-hidden>⚡</span> Tavexa
            <span className="text-[var(--color-muted)]">· Admin</span>
          </Link>
          <AdminNav />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
