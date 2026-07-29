"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/tables", label: "Tables & QR" },
  { href: "/admin/orders", label: "Live orders" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/coming-soon?feature=analytics", label: "Analytics", badge: "Soon" },
  { href: "/coming-soon?feature=pos", label: "POS Sync", badge: "Soon" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? pathname === t.href : pathname.startsWith(t.href) && t.href !== "/admin";
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-3 py-2 text-sm transition flex items-center gap-1.5 ${
              active
                ? "bg-[var(--color-surface-2)] text-white font-medium"
                : "text-[var(--color-muted)] hover:text-white"
            }`}
          >
            <span>{t.label}</span>
            {t.badge && (
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {t.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
