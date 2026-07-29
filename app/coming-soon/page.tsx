import Link from "next/link";
import { Suspense } from "react";
import ComingSoonContent from "./ComingSoonContent";

export const dynamic = "force-dynamic";

export default function ComingSoonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07080a] text-slate-100 flex items-center justify-center">
        <div className="text-xs font-mono text-slate-500">LOADING...</div>
      </div>
    }>
      <ComingSoonContent />
    </Suspense>
  );
}
