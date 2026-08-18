import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import {
  renderHabitReminder,
  renderReEngagement,
  RE_ENGAGEMENT_VARIANT_COUNT,
} from "@starter-kit/shared";
import { WELCOME_BACK_MESSAGES } from "../../../web/src/lib/welcome-back-messages";

/**
 * Writes every notification the app can send to HTML files you can open in a
 * browser, so a demo can show the real copy without sending anything or
 * waiting for a lapse. Sends no email and touches no database.
 *
 *   npm run preview:messages --workspace=@starter-kit/workers
 */

const OUT_DIR = path.resolve(__dirname, "../../../../message-previews");

/** Stand-in values, chosen to exercise the streak and habit-name branches. */
const SAMPLE = {
  name: "Omar Jabbouri",
  habitName: "Meditation",
  areaName: "Wellbeing",
  reminderTime: "20:30",
  streak: 12,
  longestStreak: 12,
};

const UNSUBSCRIBE_URL = "http://localhost:5173/api/notifications/unsubscribe?token=preview";

interface Preview {
  file: string;
  group: string;
  title: string;
  subject: string;
  html: string;
}

function buildPreviews(): Preview[] {
  const previews: Preview[] = [];

  const reminder = renderHabitReminder(
    {
      habitName: SAMPLE.habitName,
      reminderTime: SAMPLE.reminderTime,
      areaName: SAMPLE.areaName,
      streak: String(SAMPLE.streak),
    },
    UNSUBSCRIBE_URL,
  );

  previews.push({
    file: "reminder-email.html",
    group: "Habit reminder email",
    title: "Sent at the habit's reminder time",
    subject: reminder.subject,
    html: reminder.html,
  });

  for (let variant = 0; variant < RE_ENGAGEMENT_VARIANT_COUNT; variant += 1) {
    const email = renderReEngagement(
      {
        name: SAMPLE.name,
        daysInactive: "30",
        longestStreak: String(SAMPLE.longestStreak),
        topHabit: SAMPLE.habitName,
        areaName: SAMPLE.areaName,
        variant: String(variant),
      },
      UNSUBSCRIBE_URL,
    );

    previews.push({
      file: `encouragement-${variant + 1}.html`,
      group: "Encouragement email — sent after 30 days away",
      title: `Variant ${variant + 1}`,
      subject: email.subject,
      html: email.html,
    });
  }

  return previews;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The in-app popups, rendered as static cards that mirror the real dialogs. */
function popupSection(): string {
  const reminderCard = popupCard(
    `Time for ${SAMPLE.habitName}`,
    `${SAMPLE.areaName} · Scheduled for ${SAMPLE.reminderTime}. Check in now, or come back to it later today.`,
    ["Not now", "Check in"],
  );

  const welcomeCards = Object.entries(WELCOME_BACK_MESSAGES)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([days, variants]) => {
      const cards = variants
        .map((variant, i) =>
          popupCard(
            variant.heading,
            variant.body({
              daysAway: Number(days),
              longestStreak: SAMPLE.longestStreak,
            }),
            [Number(days) >= 30 ? "Let's go" : "Dismiss"],
            `Variant ${i + 1}`,
          ),
        )
        .join("\n");

      const style = Number(days) >= 30 ? "popup" : "banner";
      return `<h3>Away ${days}+ days <span class="tag">${style}</span></h3><div class="grid">${cards}</div>`;
    })
    .join("\n");

  return `
    <h2>In-app popups</h2>
    <p class="note">
      Shown inside the app. The reminder popup appears at the habit's reminder time when it
      hasn't been checked in; the welcome-back copy appears as a banner from 3 days away and
      as a popup from 30.
    </p>
    <h3>Habit reminder</h3>
    <div class="grid">${reminderCard}</div>
    ${welcomeCards}`;
}

function popupCard(
  heading: string,
  body: string,
  buttons: string[],
  label?: string,
): string {
  const actions = buttons
    .map(
      (b, i) =>
        `<span class="btn ${i === buttons.length - 1 ? "primary" : ""}">${escapeHtml(b)}</span>`,
    )
    .join("");

  return `
    <div class="card">
      ${label ? `<div class="label">${escapeHtml(label)}</div>` : ""}
      <div class="dialog">
        <div class="dot"></div>
        <div class="heading">${escapeHtml(heading)}</div>
        <div class="body">${escapeHtml(body)}</div>
        <div class="actions">${actions}</div>
      </div>
    </div>`;
}

function indexPage(previews: Preview[]): string {
  const groups = new Map<string, Preview[]>();
  for (const preview of previews) {
    groups.set(preview.group, [...(groups.get(preview.group) ?? []), preview]);
  }

  const emailSections = [...groups.entries()]
    .map(([group, items]) => {
      const rows = items
        .map(
          (item) => `
        <li>
          <a href="./${item.file}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>
          <span class="subject">${escapeHtml(item.subject)}</span>
        </li>`,
        )
        .join("");
      return `<h3>${escapeHtml(group)}</h3><ul class="list">${rows}</ul>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kultivar — message previews</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0; padding: 40px 24px 64px;
      font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a; background: #f8fafc;
    }
    main { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 18px; margin: 40px 0 8px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
    h3 { font-size: 14px; margin: 24px 0 8px; color: #475569; }
    .note { color: #64748b; margin: 0 0 8px; font-size: 14px; }
    .list { list-style: none; margin: 0; padding: 0; }
    .list li {
      display: flex; align-items: baseline; gap: 12px;
      padding: 10px 14px; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 8px; margin-bottom: 6px;
    }
    .list a { font-weight: 600; color: #16a34a; text-decoration: none; white-space: nowrap; }
    .list a:hover { text-decoration: underline; }
    .subject { color: #64748b; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .card { display: flex; flex-direction: column; gap: 6px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; }
    .dialog { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .dot { width: 32px; height: 32px; border-radius: 999px; background: #f1f5f9; border: 1px solid #e2e8f0; margin-bottom: 10px; }
    .heading { font-weight: 700; margin-bottom: 6px; }
    .body { color: #475569; font-size: 14px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
    .btn { font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; color: #475569; }
    .btn.primary { background: #0f172a; color: #fff; border-color: #0f172a; }
    .tag { font-size: 11px; font-weight: 600; color: #16a34a; background: #dcfce7; padding: 2px 8px; border-radius: 999px; }
  </style>
</head>
<body>
  <main>
    <h1>Kultivar — message previews</h1>
    <p class="note">
      Every reminder and encouragement message the app can send, rendered with sample data.
      Nothing here was emailed to anyone.
    </p>

    <h2>Emails</h2>
    <p class="note">Opens the real rendered HTML, exactly as it arrives in an inbox.</p>
    ${emailSections}

    ${popupSection()}
  </main>
</body>
</html>`;
}

function main(): void {
  const previews = buildPreviews();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const preview of previews) {
    fs.writeFileSync(path.join(OUT_DIR, preview.file), preview.html, "utf8");
  }
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), indexPage(previews), "utf8");

  const indexPath = path.join(OUT_DIR, "index.html");
  console.info(`Wrote ${previews.length} email preview(s) plus the popup gallery to:`);
  console.info(`  ${OUT_DIR}`);
  console.info(`\nOpen this file in a browser:\n  ${indexPath}`);
}

main();

// Importing the shared barrel constructs the BullMQ queues, which hold open
// Redis sockets. Nothing here needs them, so exit rather than hang.
process.exit(0);
