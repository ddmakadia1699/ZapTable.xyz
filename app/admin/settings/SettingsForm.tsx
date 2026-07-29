"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";

const FEATURES: { key: keyof Settings["features"]; label: string; hint: string }[] = [
  { key: "ordering", label: "Ordering", hint: "Guests can place orders from the menu" },
  { key: "loyalty", label: "Loyalty stamp card", hint: "Head-start card + free item on completion" },
  { key: "referral", label: "Referrals", hint: "Invite-a-friend rewards (both sides + chain)" },
  { key: "scratchReward", label: "Scratch reward", hint: "Surprise reward after each order" },
  { key: "social", label: "Meet people", hint: "Guests can join, share IG, see who's here" },
  { key: "chat", label: "1:1 chat", hint: "In-app chat between opted-in guests" },
];

export default function SettingsForm({ slug, initial }: { slug: string; initial: Settings }) {
  const [s, setS] = useState<Settings>(() => structuredClone(initial));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function patch(updater: (draft: Settings) => void) {
    setS((prev) => {
      const next = structuredClone(prev);
      updater(next);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, settings: s }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setS(structuredClone(data.settings)); // reflect server-side clamping
      setMsg({ ok: true, text: "Saved — live for guests now." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Features */}
      <Section title="Features" subtitle="Switch parts of ZapTable on or off for your venue.">
        <div className="divide-y divide-[var(--color-line)]">
          {FEATURES.map((f) => (
            <Toggle
              key={f.key}
              label={f.label}
              hint={f.hint}
              checked={s.features[f.key]}
              onChange={(v) => patch((d) => (d.features[f.key] = v))}
            />
          ))}
        </div>
      </Section>

      {/* Loyalty */}
      <Section title="Loyalty card" subtitle="Endowed-progress: a head start makes guests far likelier to finish.">
        <Row>
          <Num label="Stamps to a free item" value={s.loyalty.stampGoal} min={1} max={30}
            onChange={(v) => patch((d) => (d.loyalty.stampGoal = v))} />
          <Num label="Head-start stamps" value={s.loyalty.headStart} min={0} max={29}
            onChange={(v) => patch((d) => (d.loyalty.headStart = v))} />
          <Num label="Reward expiry (days)" value={s.loyalty.rewardTtlDays} min={1} max={90}
            onChange={(v) => patch((d) => (d.loyalty.rewardTtlDays = v))} />
        </Row>
      </Section>

      {/* Scratch reward */}
      <Section title="Scratch reward" subtitle="Odds are a fraction 0–1. The rest is 'no prize this time'.">
        <Row>
          <Num label="Cash-off amount" value={s.scratch.amount} min={0} max={100000}
            onChange={(v) => patch((d) => (d.scratch.amount = v))} />
          <Num label="Odds of cash-off" value={s.scratch.amountOdds} min={0} max={1} step={0.05}
            onChange={(v) => patch((d) => (d.scratch.amountOdds = v))} />
          <Num label="Odds of free item" value={s.scratch.freeItemOdds} min={0} max={1} step={0.05}
            onChange={(v) => patch((d) => (d.scratch.freeItemOdds = v))} />
        </Row>
      </Section>

      {/* Referral */}
      <Section title="Referrals" subtitle="A → B → C: both sides earn, and the chain-starter earns again.">
        <Row>
          <Num label="Reward each side" value={s.referral.value} min={0} max={100000}
            onChange={(v) => patch((d) => (d.referral.value = v))} />
          <Num label="Chain-starter reward" value={s.referral.level2Value} min={0} max={100000}
            onChange={(v) => patch((d) => (d.referral.level2Value = v))} />
        </Row>
      </Section>

      {/* Streak + Social */}
      <Section title="Streaks & social">
        <div className="divide-y divide-[var(--color-line)]">
          <Toggle label="Visit streaks" hint="Reward guests for visiting on a roll"
            checked={s.streak.enabled} onChange={(v) => patch((d) => (d.streak.enabled = v))} />
        </div>
        <Row>
          <Num label="Leave after (min idle)" value={s.social.sessionTtlMinutes} min={5} max={240}
            onChange={(v) => patch((d) => (d.social.sessionTtlMinutes = v))} />
          <Num label="Minimum age" value={s.social.minAge} min={0} max={99}
            onChange={(v) => patch((d) => (d.social.minAge = v))} />
        </Row>
      </Section>

      {/* Levels */}
      <Section title="Levels" subtitle="Status tiers by visit count. People act to protect status.">
        <div className="space-y-2">
          {s.levels.map((lvl, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={lvl.name}
                onChange={(e) => patch((d) => (d.levels[i].name = e.target.value))}
                className="flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={lvl.minVisits}
                onChange={(e) => patch((d) => (d.levels[i].minVisits = Number(e.target.value)))}
                className="w-24 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              />
              <span className="text-xs text-[var(--color-muted)]">visits</span>
              <button onClick={() => patch((d) => d.levels.splice(i, 1))} className="chip px-2 py-1 text-xs text-red-300">
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => patch((d) => d.levels.push({ name: "New tier", minVisits: 0 }))}
            className="chip px-3 py-1.5 text-xs"
          >
            + Add level
          </button>
        </div>
      </Section>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[var(--color-line)] bg-[var(--color-ink)]/90 py-4 backdrop-blur">
        {msg && <span className={`text-sm ${msg.ok ? "text-[var(--color-zap)]" : "text-red-400"}`}>{msg.text}</span>}
        <button onClick={save} disabled={saving} className="btn-zap px-6 py-2.5">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-[var(--color-muted)]">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-3">{children}</div>;
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-[var(--color-muted)]">{hint}</span>}
      </span>
      <span
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-none rounded-full transition ${checked ? "bg-[var(--color-zap)]" : "bg-[var(--color-surface-2)]"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[1.4rem]" : "left-0.5"}`} />
      </span>
    </label>
  );
}

function Num({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2"
      />
    </label>
  );
}
