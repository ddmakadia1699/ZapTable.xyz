"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface InterestedUser {
  id: string;
  email: string;
  createdAt: number;
}

export default function InterestedAdminPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [emails, setEmails] = useState<InterestedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);

  // Auto-login from session storage if stored
  useEffect(() => {
    const stored = sessionStorage.getItem("zaptable_interest_pwd");
    if (stored === "Dhru@1699dhru") {
      setSavedPassword(stored);
      setAuthenticated(true);
      fetchEmails(stored);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/interested/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.authenticated) {
        sessionStorage.setItem("zaptable_interest_pwd", password);
        setSavedPassword(password);
        setAuthenticated(true);
        fetchEmails(password);
      } else {
        setAuthError(data.error || "Incorrect admin password.");
      }
    } catch (err) {
      setAuthError("Failed to authenticate. Please check server.");
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchEmails = async (pwd?: string) => {
    const activePwd = pwd || savedPassword || password;
    if (!activePwd) return;

    setLoading(true);
    try {
      const res = await fetch("/api/interested", {
        headers: { "x-admin-password": activePwd },
      });
      const data = await res.json();

      if (res.ok && data.emails) {
        setEmails(data.emails);
      } else if (res.status === 401) {
        setAuthenticated(false);
        sessionStorage.removeItem("zaptable_interest_pwd");
        setAuthError("Session expired. Please enter password again.");
      }
    } catch (err) {
      console.error("Failed to fetch interested list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) return;
    const activePwd = savedPassword || password;

    try {
      const res = await fetch("/api/interested", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": activePwd,
        },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setEmails((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      alert("Failed to delete email.");
    }
  };

  const handleCopyAll = () => {
    if (!emails.length) return;
    const emailList = filteredEmails.map((e) => e.email).join(", ");
    navigator.clipboard.writeText(emailList);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (!emails.length) return;
    const headers = "ID,Email,Submitted Date,Timestamp\n";
    const rows = filteredEmails
      .map(
        (e) =>
          `"${e.id}","${e.email}","${new Date(e.createdAt).toLocaleString()}","${e.createdAt}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zaptable_interested_emails_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleLogout = () => {
    sessionStorage.removeItem("zaptable_interest_pwd");
    setSavedPassword(null);
    setAuthenticated(false);
    setPassword("");
  };

  const filteredEmails = emails.filter((item) =>
    item.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // ── Password Protection Screen ──────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#07080a] text-slate-100 flex items-center justify-center p-6 selection:bg-emerald-400 selection:text-black">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">ZapTable</span>
            </Link>
            <h1 className="text-2xl font-black text-white">Admin Access</h1>
            <p className="text-xs text-slate-400 mt-1">Enter password to view interested user list</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-xl btn-zap text-xs font-bold uppercase tracking-wider text-slate-950 hover:scale-[1.01] transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              {authLoading ? "Authenticating..." : "Unlock Interested List &rarr;"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-white transition-colors">
              &larr; Return to Home Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated Admin Dashboard ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#07080a] text-slate-100 selection:bg-emerald-400 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#07080a]/90 sticky top-0 z-50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white">ZapTable</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              Interested Leads
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchEmails()}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5"
              title="Refresh list"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Header Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Interested User Leads</h1>
            <p className="text-xs text-slate-400 mt-1">
              Full list of visitors who submitted their email for early access & beta interest.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-4">
            <div className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[130px]">
              <div className="text-2xl font-black text-emerald-400 font-mono">{emails.length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Leads</div>
            </div>

            <div className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-center min-w-[130px]">
              <div className="text-2xl font-black text-cyan-400 font-mono">
                {emails.length > 0 ? formatRelativeTime(emails[0].createdAt) : "None"}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Latest Lead</div>
            </div>
          </div>
        </div>

        {/* Action Toolbar & Search */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleCopyAll}
              disabled={!filteredEmails.length}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copied ? "Copied All!" : "Copy All Emails"}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!filteredEmails.length}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Email Data Table */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading interested users...
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              {search ? "No matching emails found." : "No interested users have registered yet. Submissions from the main page will appear here."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  <tr>
                    <th className="px-6 py-4 w-12">#</th>
                    <th className="px-6 py-4">Interested Email</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Relative Time</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEmails.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="px-6 py-4 font-mono font-bold text-white text-sm">
                        {item.email}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono">
                        {new Date(item.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id, item.email)}
                          className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 transition-all"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
