import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZapTable — Scan. Order. Eat.",
  description: "Order from your phone's browser. No app, no waiting.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ZapTable", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
