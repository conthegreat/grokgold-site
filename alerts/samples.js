/**
 * Print one sample of every alert type from the data files on disk.
 * Does not send, and does not write alert-state.json.
 *
 * The post-release sample fills Actual with a formatter fixture when the
 * live feed has no actual. The banner says so. That number is not a print.
 */
import path from "node:path";
import { dueAlerts } from "./lib/decide.js";
import { messageBrief, messageDigest, messagePost, messagePre } from "./lib/messages.js";
import { readJson, repoRoot } from "./lib/util.js";

const root = repoRoot();
const dataDir = path.join(root, "data");
const now = new Date();
const calendar = readJson(path.join(dataDir, "calendar.json"), { events: [] });
const price = readJson(path.join(dataDir, "price.json"), {});
const news = readJson(path.join(dataDir, "news.json"), { items: [] });
const briefs = readJson(path.join(dataDir, "briefs.json"), { briefs: [] });
const state = readJson(path.join(dataDir, "alert-state.json"), { sent: {} });

const high = (calendar.events || []).filter((event) => event.country === "USD" && event.impact === "High");
const numbered = high.find((event) => event.forecast && event.previous) || high[high.length - 1] || (calendar.events || [])[0];
const brief = (briefs.briefs || []).find((item) => !item.held) || null;

console.log("=== LIVE DECISION AT THIS RUN (not sent) ===");
const due = dueAlerts({
  now,
  calendar,
  previousEvents: calendar.events || [],
  briefs,
  state,
});
console.log(due.length ? due.map((alert) => alert.key).join("\n") : "No alert is inside a live window right now.");
console.log("\nPost-release stays quiet until the calendar feed has a non-empty actual that was empty on the previous run.");
console.log(`Feed includes actuals: ${Boolean(calendar.feed_includes_actual)}`);

function block(title, body) {
  console.log(`\n========== ${title} ==========\n${body}\n========== END ==========`);
}

if (!numbered) {
  console.error("No calendar event available to build samples.");
  process.exit(1);
}

block("SAMPLE 60-minute heads-up (wording only; this event is not inside the live 60-minute window)", messagePre({
  kind: "pre60",
  event: numbered,
  minutes: 60,
}));

block("SAMPLE 15-minute heads-up (wording only; this event is not inside the live 15-minute window)", messagePre({
  kind: "pre15",
  event: numbered,
  minutes: 15,
}));

const fixtureActual = "0.2%";
block(`SAMPLE post-release (FIXTURE actual "${fixtureActual}" — the live feed had no actual field, so this alert did not qualify. ${fixtureActual} is not a published print.)`, messagePost({
  ...numbered,
  actual: fixtureActual,
}));

block("SAMPLE daily digest (uses the price, calendar and headlines just fetched)", messageDigest({
  now,
  price,
  calendar,
  news,
}));

if (brief) {
  block(`SAMPLE research brief (${brief.example ? "example brief on disk" : brief.id})`, messageBrief(brief));
} else {
  console.log("\nNo brief available for a sample.");
}
