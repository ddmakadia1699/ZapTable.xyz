import type { Settings } from "./types";

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Keep admin-entered values within safe bounds so the loyalty math can't break. */
export function clampSettings(s: Settings): Settings {
  s.loyalty.stampGoal = clampNum(s.loyalty.stampGoal, 1, 30);
  s.loyalty.headStart = clampNum(s.loyalty.headStart, 0, s.loyalty.stampGoal - 1);
  s.loyalty.rewardTtlDays = clampNum(s.loyalty.rewardTtlDays, 1, 90);
  s.scratch.amountOdds = clampNum(s.scratch.amountOdds, 0, 1);
  s.scratch.freeItemOdds = clampNum(s.scratch.freeItemOdds, 0, 1 - s.scratch.amountOdds);
  s.social.sessionTtlMinutes = clampNum(s.social.sessionTtlMinutes, 5, 240);
  return s;
}
