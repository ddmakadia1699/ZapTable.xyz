"use client";

import { useState } from "react";
import Link from "next/link";
import { InterestForm } from "./InterestForm";

interface SaaSLandingProps {
  demoSlug: string;
  demoName: string;
  guestHref: string;
  tableLabel: string;
}

interface SimulatedOrder {
  id: string;
  table: string;
  items: string[];
  total: number;
  status: "Received" | "Preparing" | "Ready";
  time: string;
}

export function SaaSLanding({
  demoSlug,
  demoName,
  guestHref,
  tableLabel,
}: SaaSLandingProps) {
  const [activeTab, setActiveTab] = useState<"guest" | "admin">("guest");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  
  // Interactive ROI Calculator State
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(25000);

  // Interactive Live Order Simulator State
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [simulatedOrders, setSimulatedOrders] = useState<SimulatedOrder[]>([
    {
      id: "1042",
      table: tableLabel,
      items: ["Artisan Truffle Burger", "Matcha Cold Brew"],
      total: 20.0,
      status: "Received",
      time: "Just now",
    },
    {
      id: "1041",
      table: "4",
      items: ["Margherita Pizza", "Iced Tea"],
      total: 22.5,
      status: "Preparing",
      time: "3 min ago",
    },
  ]);

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const clearCart = () => setCart([]);

  const placeSimulatedOrder = () => {
    if (cart.length === 0) return;
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const itemNames = cart.map((i) => `${i.qty}x ${i.name}`);
    const newOrder: SimulatedOrder = {
      id: String(Math.floor(1043 + Math.random() * 900)),
      table: tableLabel,
      items: itemNames,
      total: cartTotal,
      status: "Received",
      time: "Just now",
    };
    setSimulatedOrders([newOrder, ...simulatedOrders]);
    setCart([]);
    setActiveTab("admin");
  };

  const advanceOrderStatus = (orderId: string) => {
    setSimulatedOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const nextStatus = ord.status === "Received" ? "Preparing" : "Ready";
          return { ...ord, status: nextStatus };
        }
        return ord;
      })
    );
  };

  // ROI Calculations
  const traditionalCut = Math.round(monthlyRevenue * 0.18); // 18% average commission on third-party apps
  const zapTableCost = 129; // Pro Plan
  const monthlySavings = Math.max(0, traditionalCut - zapTableCost);
  const annualSavings = monthlySavings * 12;

  return (
    <div className="min-h-screen bg-[#07080a] bg-grid-pattern text-slate-100 selection:bg-emerald-400 selection:text-black">
      {/* ── Sticky Header / Navigation Bar ─────────────────────────────── */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              ZapTable
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#simulator" className="hover:text-white transition-colors">
              Live Demo
            </a>
            <a href="#calculator" className="hover:text-white transition-colors">
              ROI Calculator
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={guestHref}
              className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition-all"
            >
              Scan Table Demo
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg btn-zap text-xs font-bold text-slate-950 transition-all shadow-sm"
            >
              Merchant Admin &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-20 overflow-hidden border-b border-slate-800/60 zap-glow">
        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Live Status Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-xs font-semibold text-emerald-400 mb-8 shadow-inner">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Zero-Friction Dine-In QR Infrastructure</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-normal">0% Commission Cut</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-[1.1]">
              Scan. Order.{" "}
              <span className="text-gradient-emerald">
                Eat.
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-lg sm:text-2xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
              The high-velocity digital ordering platform for modern restaurants. Guests scan, order, and pay directly in their phone browser -{" "}
              <strong className="text-white font-semibold">no app downloads, no account setup, zero waiting.</strong>
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/admin"
                className="w-full sm:w-auto px-8 py-4 rounded-xl btn-zap text-base font-bold shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2.5"
              >
                <span>Launch Restaurant Admin</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>

              <Link
                href={guestHref}
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-900 hover:border-slate-600 text-base font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <span>Test Guest QR Scan</span>
                <span className="text-xs text-slate-400 font-mono">({demoName})</span>
              </Link>
            </div>

            {/* Interest Email Capture Form */}
            <div className="mt-10 max-w-xl mx-auto p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2 mb-3 px-1">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Express Interest for Beta Access
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Join 200+ venues</span>
              </div>
              <InterestForm
                placeholder="Enter work email to express interest..."
                buttonText="Submit Interest ⚡"
              />
            </div>

            {/* Metrics Counter Bar */}
            <div className="mt-16 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="text-2xl font-black text-white font-mono">&lt; 500ms</div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Instant QR Load Speed</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="text-2xl font-black text-emerald-400 font-mono">0% Cut</div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Flat Subscription Only</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="text-2xl font-black text-cyan-400 font-mono">2 Min</div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">AI Photo Menu Setup</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="text-2xl font-black text-purple-400 font-mono">100% PWA</div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Mobile Browser Native</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Live Simulator Section ─────────────────────────── */}
      <section id="simulator" className="py-20 border-b border-slate-800/60 bg-slate-950/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">
              Interactive Sandbox
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Try the Live Order Simulator
            </h3>
            <p className="mt-3 text-sm text-slate-400">
              Add items on the guest phone frame on the left, click &quot;Place Order&quot;, and watch it appear immediately on the Kitchen Dispatch Board on the right.
            </p>

            {/* Tab Switcher for Mobile Devices */}
            <div className="mt-6 inline-flex md:hidden p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                onClick={() => setActiveTab("guest")}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === "guest"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400"
                }`}
              >
                Guest Mobile View
              </button>
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === "admin"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400"
                }`}
              >
                Kitchen Dispatch ({simulatedOrders.length})
              </button>
            </div>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Guest Phone */}
            <div className={`md:col-span-6 ${activeTab === "guest" ? "block" : "hidden md:block"}`}>
              <div className="rounded-3xl border-4 border-slate-800 bg-slate-950 p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{demoName}</span>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                        Table {tableLabel}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Guest Order Terminal</div>
                  </div>
                  <button
                    onClick={clearCart}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tap + to add items:</div>

                  {[
                    { id: "m1", name: "Artisan Truffle Burger", price: 14.5, desc: "Brioche, aged cheddar, truffle aioli" },
                    { id: "m2", name: "Matcha Cold Brew", price: 5.5, desc: "Organic matcha, oat milk, vanilla" },
                    { id: "m3", name: "Margherita Wood-Fired Pizza", price: 17.0, desc: "San Marzano, fresh mozzarella, basil" },
                    { id: "m4", name: "Crispy Garlic Fries", price: 6.5, desc: "Sea salt, rosemary, garlic aioli" },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.desc}</div>
                        <div className="text-xs font-bold text-emerald-400 mt-0.5">${item.price.toFixed(2)}</div>
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-colors flex items-center justify-center shrink-0 ml-3"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>

                {/* Cart summary & place order */}
                <div className="pt-2 border-t border-slate-800">
                  {cart.length === 0 ? (
                    <div className="text-center py-2 text-xs text-slate-500 italic">
                      Select items above to test live order dispatch
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-300 space-y-1">
                        {cart.map((c) => (
                          <div key={c.id} className="flex justify-between text-[11px]">
                            <span>{c.qty}x {c.name}</span>
                            <span className="font-mono text-emerald-400">${(c.price * c.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={placeSimulatedOrder}
                        className="w-full py-3 rounded-xl btn-zap text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <span>Place Order (${cart.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}) &rarr;</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Kitchen Dispatch Board */}
            <div className={`md:col-span-6 ${activeTab === "admin" ? "block" : "hidden md:block"}`}>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Kitchen Dispatch KDS</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                        {simulatedOrders.length} ORDERS ACTIVE
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Real-Time Kitchen Feed</div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Auto-Refreshed</span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {simulatedOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        ord.status === "Received"
                          ? "bg-slate-900 border-amber-500/40 shadow-sm shadow-amber-500/5"
                          : ord.status === "Preparing"
                          ? "bg-slate-900 border-cyan-500/40"
                          : "bg-slate-900 border-emerald-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-white">#{ord.id}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded">
                            Table {ord.table}
                          </span>
                          <span className="text-[10px] text-slate-500">{ord.time}</span>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            ord.status === "Received"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : ord.status === "Preparing"
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {ord.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-300 font-medium">
                        {ord.items.join(", ")}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          ${ord.total.toFixed(2)}
                        </span>

                        {ord.status !== "Ready" && (
                          <button
                            onClick={() => advanceOrderStatus(ord.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-colors"
                          >
                            Mark {ord.status === "Received" ? "Preparing" : "Ready"} &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive ROI Savings Calculator ─────────────────────────── */}
      <section id="calculator" className="py-20 border-b border-slate-800/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">
                0% Commission Guarantee
              </h2>
              <h3 className="text-3xl font-extrabold text-white">
                Calculate Your Restaurant&apos;s Annual Savings
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                Third-party delivery and ordering apps charge 15% - 30% per order. ZapTable charges $0 commission.
              </p>
            </div>

            {/* Slider control */}
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <div className="flex justify-between items-center text-sm font-semibold mb-3">
                  <span className="text-slate-300">Monthly Dine-In Revenue:</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">${monthlyRevenue.toLocaleString()} / mo</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="150000"
                  step="5000"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
                  <span>$5,000 / mo</span>
                  <span>$75,000 / mo</span>
                  <span>$150,000 / mo</span>
                </div>
              </div>

              {/* Calculated comparison box */}
              <div className="grid sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800 text-center">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Delivery App Fees (18%)</div>
                  <div className="text-xl font-bold text-red-400 font-mono mt-1">${traditionalCut.toLocaleString()} / mo</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">ZapTable SaaS Cost</div>
                  <div className="text-xl font-bold text-cyan-400 font-mono mt-1">${zapTableCost} / mo</div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-xs text-emerald-400 uppercase tracking-wider font-bold">Your Extra Profit</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-1">+${annualSavings.toLocaleString()} / yr</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Grid Section ───────────────────────────────────────── */}
      <section id="features" className="py-20 border-b border-slate-800/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">
              Enterprise Feature Set
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Built to Scale from Single Cafe to Multi-Location
            </h3>
            <p className="mt-3 text-slate-400 text-sm">
              Eliminate paper menus, hardware maintenance, and order taking delay.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="card p-6">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-white">AI Vision Menu Importer</h4>
              <p className="mt-2 text-slate-400 text-xs leading-relaxed">
                Upload a photo or PDF of your physical menu. Claude Vision AI extracts items, descriptions, categories, and prices automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-6">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 14h3v3m0 4h4v-4m-4 0h4" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-white">Automated QR Token Generator</h4>
              <p className="mt-2 text-slate-400 text-xs leading-relaxed">
                Generate secure table tokens instantly. Export print-ready table tents and sticker layouts as PDF files for immediate deployment.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-6">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-white">Browser-Native Mobile Ordering</h4>
              <p className="mt-2 text-slate-400 text-xs leading-relaxed">
                Guests scan and order in under 10 seconds. No app store downloads, user account registration, or logins required.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card p-6">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-white">Direct Payment Integration</h4>
              <p className="mt-2 text-slate-400 text-xs leading-relaxed">
                Integrates directly with Stripe (Apple Pay, Google Pay &amp; Credit Cards). 100% of revenue settles straight to your merchant bank account.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card p-6">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-white">Kitchen Display System (KDS)</h4>
              <p className="mt-2 text-slate-400 text-xs leading-relaxed">
                Streamlined web dashboard for kitchen staff. Single-click order status progression (Received &rarr; Preparing &rarr; Ready &rarr; Served).
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card p-6">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V3.5A1.5 1.5 0 0113.5 2h0A1.5 1.5 0 0115 3.5V8m-3 0V3.5A1.5 1.5 0 0010.5 2h0A1.5 1.5 0 009 3.5V8m-6 4h18M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-white">Loyalty &amp; Chained Referrals</h4>
              <p className="mt-2 text-slate-400 text-xs leading-relaxed">
                Automated guest stamp cards, instant scratch rewards, and friend-invite incentives configured directly from merchant settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Operator Testimonials / Social Proof ───────────────────────── */}
      <section className="py-20 border-b border-slate-800/60 bg-slate-950/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">
              Operator Feedback
            </h2>
            <h3 className="text-3xl font-extrabold text-white">
              Trusted by Leading Cafes &amp; Casual Dining Rooms
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="flex gap-1 text-amber-400 mb-3 text-xs">★★★★★</div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &quot;ZapTable eliminated our weekend order lines completely. Guests scan the QR at their table, order drinks immediately, and our average table turnover speed improved by 14 minutes.&quot;
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  MC
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Marcus Chen</div>
                  <div className="text-[10px] text-slate-400">Founder, Artisan Brew Lab</div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex gap-1 text-amber-400 mb-3 text-xs">★★★★★</div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &quot;Uploading our menu photo and having AI auto-generate our digital menu took less than 2 minutes. We saved over $1,800/month by bypassing third-party percentage commissions.&quot;
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs">
                  SL
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Sarah Lin</div>
                  <div className="text-[10px] text-slate-400">General Manager, Osteria Bella</div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex gap-1 text-amber-400 mb-3 text-xs">★★★★★</div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &quot;The zero-app-download experience is the killer feature. Older diners and young guests alike just point their camera and order. It feels like magic.&quot;
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-xs">
                  DR
                </div>
                <div>
                  <div className="text-xs font-bold text-white">David Rivera</div>
                  <div className="text-[10px] text-slate-400">Operations Director, Taco Social</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 border-b border-slate-800/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">
              SaaS Subscription
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Flat Transparent SaaS Pricing
            </h3>
            <p className="mt-3 text-slate-400 text-sm">
              Keep 100% of your order revenue. Zero per-order percentage take rates.
            </p>

            {/* Billing period switcher */}
            <div className="mt-6 inline-flex items-center gap-2 p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  billingPeriod === "yearly"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] text-emerald-400 font-mono">(-20%)</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {/* Tier 1: Lite */}
            <div className="card p-6 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">LITE TIER</div>
                <h4 className="text-xl font-bold text-white mt-1">Small Cafes &amp; Kiosks</h4>
                <p className="text-xs text-slate-400 mt-1">Designed for food trucks, coffee counters, and small venues.</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    {billingPeriod === "monthly" ? "$49" : "$39"}
                  </span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Up to 15 Active Tables
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> AI Vision Menu Importer
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> PDF Table QR Generator
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Standard Order View
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Stripe Payment Integration
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href="/admin"
                  className="w-full py-2.5 rounded-lg bg-slate-800 text-white text-center font-semibold text-xs block hover:bg-slate-700 transition-all"
                >
                  Get Started
                </Link>
              </div>
            </div>

            {/* Tier 2: Pro (Featured) */}
            <div className="card p-6 flex flex-col justify-between border-2 border-emerald-500 bg-slate-900/80 relative shadow-xl shadow-emerald-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 px-3 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider">
                MOST POPULAR
              </div>

              <div>
                <div className="text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">PRO TIER</div>
                <h4 className="text-xl font-bold text-white mt-1">Full-Service Restaurants</h4>
                <p className="text-xs text-slate-400 mt-1">Full suite for high-volume dining rooms and bars.</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    {billingPeriod === "monthly" ? "$129" : "$99"}
                  </span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> <strong>Unlimited Tables &amp; QRs</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Advanced AI OCR Categorizer
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Real-Time Kitchen Display System
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Guest Order Progress Tracker
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Loyalty Cards &amp; Instant Prizes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Chained Viral Referral System
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link href="/admin" className="w-full py-2.5 rounded-lg btn-zap text-slate-950 text-center font-bold text-xs block transition-all shadow-md shadow-emerald-500/20">
                  Start Merchant Admin &rarr;
                </Link>
              </div>
            </div>

            {/* Tier 3: Enterprise */}
            <div className="card p-6 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">ENTERPRISE</div>
                <h4 className="text-xl font-bold text-white mt-1">Chains &amp; Groups</h4>
                <p className="text-xs text-slate-400 mt-1">Multi-location management and POS integrations.</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">Custom</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Multi-Location Portal
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Legacy POS Integrations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Custom Domain Mapping
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span> Dedicated Account Manager &amp; SLA
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href="/coming-soon?feature=enterprise"
                  className="w-full py-2.5 rounded-lg bg-slate-800 text-white text-center font-semibold text-xs block hover:bg-slate-700 transition-all"
                >
                  Contact Enterprise Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 border-b border-slate-800/60 bg-slate-950/20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Technical and operational details for prospective merchants.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Do dining guests need to download an application?",
                a: "No. ZapTable is completely browser-native. Guests scan the table QR code with their default camera app and the digital menu opens immediately in Safari, Chrome, or any mobile browser without downloads or signups.",
              },
              {
                q: "How does the AI Menu Importer process physical menus?",
                a: "You can upload a photo of your paper menu or a PDF document in the Admin dashboard. Claude Vision AI extracts items, descriptions, categories, and prices automatically, populating your menu database in seconds.",
              },
              {
                q: "Does ZapTable take a commission cut on customer orders?",
                a: "No. ZapTable is a flat monthly SaaS product. We take 0% per-order commission. 100% of customer order payouts settle directly into your merchant Stripe account.",
              },
              {
                q: "What hardware is required for the kitchen staff?",
                a: "No proprietary hardware is required. The live Kitchen Display System (KDS) runs on any standard iPad, Android tablet, smartphone, or laptop browser connected to the internet.",
              },
              {
                q: "How are table QR codes secured and exported?",
                a: "Table QR codes contain unique tokens generated per table. From your admin portal, you can export high-resolution, print-ready PDF layouts for table stands or stickers.",
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-800 bg-slate-900/30 overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-slate-200 hover:text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  <svg
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      faqOpen === index ? "rotate-180 text-emerald-400" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {faqOpen === index && (
                  <div className="px-5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-200 font-bold">ZapTable</span>
            <span>- Modern Dine-In QR Infrastructure</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/admin" className="hover:text-slate-300 transition-colors">
              Merchant Admin
            </Link>
            <Link href={guestHref} className="hover:text-slate-300 transition-colors">
              Guest Demo
            </Link>
            <a href="#features" className="hover:text-slate-300 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">
              Pricing
            </a>
          </div>

          <div>
            &copy; {new Date().getFullYear()} ZapTable. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
