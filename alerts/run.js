import path from "node:path";
import { fetchCalendar } from "./lib/calendar.js";
import { fetchPrice } from "./lib/price.js";
import { fetchNews } from "./lib/news.js";
import { loadBriefs } from "./lib/briefs.js";
import { dueAlerts } from "./lib/decide.js";
import { renderAlert } from "./lib/messages.js";
import { readJson, repoRoot, utcIso, writeJson } from "./lib/util.js";
import { commitDataIfChanged } from "./lib/commit.js";
import { credentialsFromEnv, deliverAlerts } from "./telegram.js";

const root = repoRoot();
const dataDir = path.join(root, "data");

function keepPrevious(file, next, label) {
  if (next.ok) return next;
  const previous = readJson(file);
  if (!previous) return next;
  console.error(`${label} failed (${next.error || "unknown"}). Keeping the previous file and noting this attempt.`);
  return {
    ...previous,
    ok: false,
    stale: true,
    last_attempt_utc: next.fetched_utc || utcIso(new Date()),
    last_error: next.error || next.note || "fetch failed",
    attempts: next.attempts || previous.attempts,
  };
}

export async function runPipeline(now = new Date()) {
  const calendarFile = path.join(dataDir, "calendar.json");
  const priceFile = path.join(dataDir, "price.json");
  const historyFile = path.join(dataDir, "price-history.json");
  const newsFile = path.join(dataDir, "news.json");
  const briefsFile = path.join(dataDir, "briefs.json");
  const stateFile = path.join(dataDir, "alert-state.json");

  const previousCalendar = readJson(calendarFile);
  const previousHistory = readJson(historyFile);

  const [calendarRaw, pricePack, newsRaw] = await Promise.all([
    fetchCalendar(now),
    fetchPrice(previousHistory, now),
    fetchNews(now),
  ]);
  const calendar = keepPrevious(calendarFile, calendarRaw, "Calendar");
  const news = keepPrevious(newsFile, newsRaw, "News");
  let { price, history } = pricePack;
  if (!price.ok) {
    const previousPrice = readJson(priceFile);
    if (previousPrice?.price != null) {
      console.error(`Price failed (${price.error}). Keeping the previous spot print.`);
      price = {
        ...previousPrice,
        ok: false,
        stale: true,
        last_attempt_utc: price.fetched_utc,
        last_error: price.error,
        attempts: price.attempts,
      };
    }
  }

  const briefs = loadBriefs(path.join(dataDir, "briefs"), now);
  const state = readJson(stateFile, {
    sent: {},
    note: "Keys are written only after Telegram accepts a message. Dry-runs are not recorded.",
  });

  writeJson(calendarFile, calendar);
  writeJson(priceFile, price);
  writeJson(historyFile, history);
  writeJson(newsFile, news);
  writeJson(briefsFile, briefs);

  const due = dueAlerts({
    now,
    calendar,
    previousEvents: previousCalendar?.events || [],
    briefs,
    state,
  }).map((alert) => ({
    ...alert,
    text: renderAlert(alert, { now, price, calendar, news }),
  }));

  const creds = credentialsFromEnv();
  console.log(creds.dryRun
    ? "Telegram secrets missing. Dry-run only; nothing is marked sent."
    : "Telegram credentials present. Sending due alerts.");
  console.log(`Due alerts: ${due.length ? due.map((alert) => alert.key).join(", ") : "none"}`);
  for (const attempt of [
    ["calendar", calendar],
    ["price", price],
    ["news", news],
  ]) {
    const [name, payload] = attempt;
    const errors = (payload.attempts || payload.feeds || [])
      .filter((row) => !row.ok)
      .map((row) => `${row.name || row.source || row.id}: ${row.error || row.status}`);
    console.log(`${name}: ok=${Boolean(payload.ok)} ${errors.length ? `failures: ${errors.join(" | ")}` : "sources ok"}`);
  }
  if (briefs.rejected.length) {
    console.error(`Rejected briefs: ${JSON.stringify(briefs.rejected)}`);
  }

  const results = await deliverAlerts(due, creds);
  let stateChanged = false;
  for (const result of results) {
    if (result.ok && !result.dryRun) {
      state.sent[result.key] = { at: utcIso(now), message_id: result.message_id };
      stateChanged = true;
    }
  }
  if (stateChanged || !readJson(stateFile)) {
    state.updated_utc = utcIso(now);
    state.note = "Keys are written only after Telegram accepts a message. Dry-runs are not recorded.";
    writeJson(stateFile, state);
  }
  return { calendar, price, news, briefs, due, results };
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isDirect) {
  runPipeline()
    .then(() => commitDataIfChanged(root))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
