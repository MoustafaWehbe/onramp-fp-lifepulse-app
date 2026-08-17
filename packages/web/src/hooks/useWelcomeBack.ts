import { useCallback, useState } from "react";
import { useCheckInActivity } from "@/hooks/useCheckIns";
import { welcomeBackMessage } from "@/lib/welcome-back-messages";
import { isDemoPopup } from "@/lib/demo";

/** Below this the user isn't really "back" — they just skipped a day. */
const LAPSE_THRESHOLD_DAYS = 3;

/**
 * A month away is a real return rather than a busy week, so it gets a popup
 * the user has to acknowledge. Shorter lapses stay a banner, which nudges
 * without interrupting.
 */
const POPUP_THRESHOLD_DAYS = 30;

const DISMISSED_KEY = "kultivar:welcome-back-dismissed";

/** Dismissal lasts the day; a longer memory would hide a genuine second lapse. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface WelcomeBackState {
  mode: "none" | "banner" | "popup";
  heading: string;
  body: string;
  dismiss: () => void;
}

/**
 * Owns the returning-user greeting. Call this once per screen and pass the
 * result down — a second instance would keep its own dismissal state and the
 * two would disagree about whether the greeting is still showing.
 */
export function useWelcomeBack(): WelcomeBackState {
  const { data: activity } = useCheckInActivity();
  const forced = isDemoPopup("welcome");

  // A stored dismissal would hide the forced popup, which defeats the point of
  // being able to show it on demand.
  const [dismissed, setDismissed] = useState(
    () => !forced && localStorage.getItem(DISMISSED_KEY) === todayKey(),
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, todayKey());
    setDismissed(true);
  }, []);

  const realDaysAway = activity?.daysSinceLastCheckIn ?? 0;
  const daysAway = forced
    ? Math.max(realDaysAway, POPUP_THRESHOLD_DAYS)
    : realDaysAway;

  // Asking for the reminder popup means asking for that one specifically; on a
  // genuinely lapsed account the greeting would otherwise cover it.
  if (isDemoPopup("reminder")) {
    return { mode: "none", heading: "", body: "", dismiss };
  }

  if (dismissed || (!forced && (!activity || daysAway < LAPSE_THRESHOLD_DAYS))) {
    return { mode: "none", heading: "", body: "", dismiss };
  }

  return {
    mode: daysAway >= POPUP_THRESHOLD_DAYS ? "popup" : "banner",
    // Seeded by the day so the wording holds steady until tomorrow.
    ...welcomeBackMessage(daysAway, activity?.longestStreak ?? 0, todayKey()),
    dismiss,
  };
}
