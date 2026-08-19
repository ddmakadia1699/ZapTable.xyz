"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { InterestForm } from "../components/InterestForm";

const FEATURE_DETAILS: Record<string, { title: string; subtitle: string; tag: string }> = {
  enterprise: {
    title: "Enterprise Multi-Location Management",
    subtitle: "Centralized brand administration, role-based access control, custom POS syncing, and dedicated account management.",
    tag: "ENTERPRISE_MODULE",
  },
  analytics: {
    title: "Advanced Kitchen & Revenue Analytics",
    subtitle: "Real-time kitchen prep times, hourly traffic metrics, best-selling item breakdowns, and average ticket size intelligence.",
    tag: "ANALYTICS_V2",
  },
  pos: {
    title: "Legacy POS Hardware Integration",
    subtitle: "Direct bi-directional synchronization with Toast, Clover, Micros, and Square POS terminals.",
    tag: "INTEGRATIONS",
  },
  "ai-chat": {
    title: "Conversational AI Menu Recommendations",
    subtitle: "Guests ask dietary, allergy, or wine pairing questions in natural language and receive instant AI menu suggestions.",
    tag: "AI_MODULE",
  },
};

export default function ComingSoonContent() {
  const searchParams = useSearchParams();
  const featureKey = searchParams.get("feature") || "roadmap";
  const feature = FEATURE_DETAILS[featureKey] || {
    title: "Upcoming Feature Expansion",
    subtitle: "This module is currently in private beta and will be rolling out in an upcoming release cycle.",
    tag: "BETA_MODULE",
  };

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-slate-100 selection:bg-emerald-400 selection:text-black flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-[#07080a]">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Tavexa
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-6 py-20 text-center flex-1 flex flex-col justify-center items-center">
        {/* Module Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[11px] font-mono font-semibold text-emerald-400 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{feature.tag} // COMING SOON</span>
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          {feature.title}
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
          {feature.subtitle}
        </p>

        {/* Early Access Form */}
        <div className="mt-10 w-full max-w-md">
          <InterestForm placeholder="Enter work email for beta access..." buttonText="Notify Me ⚡" />
        </div>

        {/* Quick Links */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 text-xs font-semibold text-slate-400">
          <Link href="/admin" className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white transition-all">
            Merchant Admin Dashboard
          </Link>
          <Link href="/r/demo-cafe/t/t1" className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:text-white transition-all">
            Try Guest Table Demo
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Tavexa. All rights reserved.
      </footer>
    </div>
  );
}
