import { DEMO_SLUG, getSettings } from "@/lib/db/repo";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = (await getSettings(DEMO_SLUG))!;
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Turn features on or off and tune rewards, streaks and levels. Changes apply to your
        guests immediately.
      </p>
      <SettingsForm slug={DEMO_SLUG} initial={settings} />
    </div>
  );
}
