"use client";

import { useState } from "react";

interface InterestFormProps {
  variant?: "hero" | "compact" | "card";
  placeholder?: string;
  buttonText?: string;
}

export function InterestForm({
  variant = "hero",
  placeholder = "Enter your work email for early access...",
  buttonText = "Express Interest ⚡",
}: InterestFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus({ type: "error", message: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({ type: "success", message: data.message || "Thank you for expressing interest!" });
        setEmail("");
      } else {
        setStatus({ type: "error", message: data.error || "Failed to record interest. Please try again." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl btn-zap text-xs font-bold uppercase tracking-wider text-slate-950 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-orange-500/20"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </span>
          ) : (
            buttonText
          )}
        </button>
      </form>

      {status && (
        <div
          className={`mt-3 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            status.type === "success"
              ? "bg-orange-500/10 border border-orange-500/30 text-orange-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
          }`}
        >
          <span>{status.type === "success" ? "✓" : "⚠️"}</span>
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
