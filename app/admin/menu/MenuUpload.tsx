"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function MenuUpload({ slug }: { slug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      const res = await fetch("/api/menu/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setMsg({
        kind: "ok",
        text:
          `Read ${data.count} items ` +
          (data.source === "bedrock"
            ? "with Claude on AWS Bedrock."
            : data.source === "anthropic"
              ? "with Claude vision."
              : "(sample menu - set ANTHROPIC_API_KEY or LLM_PROVIDER=bedrock for real reading)."),
      });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold">Upload your menu</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Drop a photo or PDF of your existing menu. Tavexa reads it into items,
        prices and categories - review and tweak below. Replaces the current menu.
      </p>

      <label
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface-2)] px-6 py-10 text-center transition hover:border-[var(--color-zap)] ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <span className="text-2xl" aria-hidden>
          {busy ? "⏳" : "📸"}
        </span>
        <span className="mt-2 text-sm font-medium">
          {busy ? "Reading your menu…" : "Tap to upload a photo or PDF"}
        </span>
        <span className="mt-1 text-xs text-[var(--color-muted)]">JPG, PNG or PDF</span>
      </label>

      {msg && (
        <p
          className={`mt-3 text-sm ${
            msg.kind === "ok" ? "text-[var(--color-zap)]" : "text-red-400"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
