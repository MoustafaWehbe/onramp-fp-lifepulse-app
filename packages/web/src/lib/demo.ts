/**
 * Presentation escape hatches, read from the query string:
 *
 *   /today?demo=welcome   forces the returning-user popup
 *   /today?demo=reminder  forces a habit reminder popup
 *
 * Both popups normally depend on real conditions — a month without a check-in,
 * or a reminder time that has passed — which can't be conjured up during a
 * demo without falsifying the account's history. These flags only change what
 * is rendered; no data is written, and removing the parameter restores the
 * real behaviour immediately.
 */
export type DemoPopup = "welcome" | "reminder";

export function isDemoPopup(name: DemoPopup): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === name;
}
