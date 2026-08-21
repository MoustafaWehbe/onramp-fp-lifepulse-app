/**
 * Presentation escape hatches for popups that normally need real history
 * (a month without a check-in, a reminder time that has passed):
 *
 *   /today?demo=welcome   forces the returning-user popup
 *   /today?demo=reminder  forces a habit reminder popup
 *
 * Render-only — nothing is written, and dropping the parameter restores the
 * real behaviour.
 */
export type DemoPopup = "welcome" | "reminder";

export function isDemoPopup(name: DemoPopup): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === name;
}
