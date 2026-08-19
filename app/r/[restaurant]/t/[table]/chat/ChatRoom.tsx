"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

export default function ChatRoom({
  slug,
  tableId,
  withCode,
}: {
  slug: string;
  tableId: string;
  withCode: string;
}) {
  const [me, setMe] = useState<string | null>(null);
  const [withName, setWithName] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setMe(localStorage.getItem(`tavexa:me:${slug}`));
    } catch {
      setMe(null);
    }
  }, [slug]);

  const load = useCallback(async () => {
    if (!me) return;
    const res = await fetch(`/api/chat?slug=${slug}&me=${me}&with=${withCode}`, { cache: "no-store" });
    const data = await res.json();
    setWithName(data.withName ?? "Guest");
    setMessages(data.messages ?? []);
    setBlocked(Boolean(data.blocked));
  }, [me, slug, withCode]);

  useEffect(() => {
    if (!me) return;
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [me, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || !me) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, from: me, to: withCode, text: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send");
      setText("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  async function blockUser() {
    if (!me) return;
    if (!confirm(`Block & report ${withName}? They won't be able to message you.`)) return;
    await fetch("/api/chat/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ me, target: withCode }),
    });
    setBlocked(true);
  }

  const backHref = `/r/${slug}/t/${tableId}`;

  if (me === null) {
    return (
      <main className="zap-glow flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Order first to chat</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Chatting opens up once you&apos;ve placed an order and opted in.
          </p>
          <Link href={backHref} className="mt-4 inline-block text-sm text-[var(--color-zap)] hover:underline">
            ← Back to the menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={backHref} className="text-[var(--color-muted)]">
            ←
          </Link>
          <div>
            <div className="font-semibold">{withName}</div>
            <div className="text-xs text-[var(--color-muted)]">Chatting here · first names only</div>
          </div>
        </div>
        <button onClick={blockUser} className="chip px-3 py-1.5 text-xs text-red-300">
          Block & report
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
            Say hi 👋 Keep it kind - be respectful.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.fromCode === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine ? "bg-[var(--color-zap)] text-[#04140c]" : "bg-[var(--color-surface-2)]"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {blocked ? (
        <div className="border-t border-[var(--color-line)] px-4 py-4 text-center text-sm text-[var(--color-muted)]">
          This conversation is blocked.{" "}
          <Link href={backHref} className="text-[var(--color-zap)] hover:underline">
            Back to menu
          </Link>
        </div>
      ) : (
        <div className="border-t border-[var(--color-line)] px-4 py-3">
          {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              maxLength={500}
              placeholder="Message…"
              className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-2.5"
            />
            <button onClick={send} disabled={sending || !text.trim()} className="btn-zap flex-none px-5 py-2.5">
              Send
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
