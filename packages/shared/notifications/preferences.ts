import { NotificationPreference } from "../db/models";
import { appUrl } from "../email/client";
import { localTimeInTimeZone } from "../utils/date";

/**
 * Preferences are created lazily rather than at signup so existing users get a
 * row the first time notifications touch them, with permissive defaults that
 * match what they'd have experienced before preferences existed.
 */
export async function getOrCreatePreferences(
  userId: string,
): Promise<NotificationPreference> {
  const [preference] = await NotificationPreference.findOrCreate({
    where: { userId },
    defaults: { userId },
  });
  return preference;
}

export function unsubscribeUrl(token: string): string {
  return appUrl(`/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`);
}

/**
 * Quiet hours are a wall-clock window that may wrap past midnight
 * (e.g. 22:00 -> 07:00), so the comparison flips when start > end.
 */
export function isWithinQuietHours(
  preference: Pick<
    NotificationPreference,
    "quietHoursStart" | "quietHoursEnd" | "timezone"
  >,
  fallbackTimeZone = "UTC",
  at: Date = new Date(),
): boolean {
  const { quietHoursStart, quietHoursEnd } = preference;
  if (!quietHoursStart || !quietHoursEnd || quietHoursStart === quietHoursEnd) {
    return false;
  }

  const now = localTimeInTimeZone(preference.timezone ?? fallbackTimeZone, at);

  return quietHoursStart < quietHoursEnd
    ? now >= quietHoursStart && now < quietHoursEnd
    : now >= quietHoursStart || now < quietHoursEnd;
}
