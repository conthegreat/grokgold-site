import { DISCLAIMER, clip, escHtml, formatUsd, formatWhen, londonParts, signed } from "./util.js";

const DASHBOARD = "https://conthegreat.github.io/grokgold-site/desk/";

function line(label, value) {
  const shown = value ? escHtml(value) : "not published";
  return `${escHtml(label)}: ${shown}`;
}

function minutesLabel(minutes) {
  const rounded = Math.max(1, Math.round(minutes));
  if (rounded < 60) return `${rounded} minutes`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  const hourWord = hours === 1 ? "hour" : "hours";
  return rest ? `${hours} ${hourWord} ${rest} minutes` : `${hours} ${hourWord}`;
}

export function parseFirstNumber(value) {
  if (!value) return null;
  const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  return Number(match[0]);
}

export function unitToken(value) {
  const s = String(value || "").toUpperCase();
  if (s.includes("%")) return "%";
  if (/[0-9]\s*K\b/.test(s)) return "K";
  if (/[0-9]\s*M\b/.test(s)) return "M";
  if (/[0-9]\s*B\b/.test(s)) return "B";
  return "";
}

export function compareActual(actual, forecast) {
  const a = parseFirstNumber(actual);
  const f = parseFirstNumber(forecast);
  if (a == null || f == null || unitToken(actual) !== unitToken(forecast)) {
    return "A numeric comparison with the consensus forecast is not available from the published text.";
  }
  if (a > f) return "The actual is above the consensus forecast. That compares the two published figures only.";
  if (a < f) return "The actual is below the consensus forecast. That compares the two published figures only.";
  return "The actual matches the consensus forecast. That compares the two published figures only.";
}

function footer() {
  return `\n\n${DISCLAIMER}`;
}

function eventFacts(event) {
  return [
    `<b>${escHtml(event.title)}</b> (${escHtml(event.country)}, ${escHtml(event.impact)} impact)`,
    `When: ${escHtml(formatWhen(event.time_utc))}`,
    line("Consensus forecast (calendar feed)", event.forecast),
    line("Previous (calendar feed)", event.previous),
  ];
}

export function messagePre({ kind, event, minutes }) {
  const heading = kind === "pre15" ? "15-minute heads-up" : "60-minute heads-up";
  const text = [
    `<b>Gold Radar · ${heading}</b>`,
    "High-impact US data is approaching. This is a calendar notice only.",
    "",
    ...eventFacts(event),
    `About ${escHtml(minutesLabel(minutes))} until the release.`,
    "",
    `<b>Why gold watchers follow it</b>`,
    escHtml(event.why_gold_watchers_follow),
    "",
    `Dashboard: ${escHtml(DASHBOARD)}`,
  ].join("\n");
  return `${text}${footer()}`;
}

export function messagePost(event) {
  const text = [
    "<b>Gold Radar · Figure printed</b>",
    "The calendar feed now has an actual for this high-impact US release.",
    "",
    ...eventFacts(event),
    line("Actual (calendar feed)", event.actual),
    "",
    escHtml(compareActual(event.actual, event.forecast)),
    "The comparison is not a view on gold.",
    "",
    `Dashboard: ${escHtml(DASHBOARD)}`,
  ].join("\n");
  return `${text}${footer()}`;
}

function headlineLine(item, index) {
  const tone = item.tone === "bullish" ? "Bullish tone" : item.tone === "bearish" ? "Bearish tone" : "Neutral tone";
  const title = escHtml(clip(item.title, 180));
  const source = item.source ? ` — ${escHtml(clip(item.source, 40))}` : "";
  return `${index + 1}. ${title}${source} — ${tone}`;
}

export function messageDigest({ now, price, calendar, news }) {
  const london = londonParts(now);
  const londonDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const today = (calendar.events || []).filter((event) => event.london_date === london.date);
  const priceLines = [];
  if (price?.price != null) {
    priceLines.push(`<b>${escHtml(price.symbol)}</b> ${escHtml(formatUsd(price.price))} ${escHtml(price.currency)} per troy ounce`);
    priceLines.push(escHtml(price.instrument_label));
    priceLines.push(price.change_24h_display
      ? escHtml(price.change_24h_display)
      : "24-hour change: not available on this run.");
    priceLines.push(`Source: ${escHtml(price.source || "unavailable")}${price.provider_time_utc ? `, provider time ${escHtml(formatWhen(price.provider_time_utc))}` : ""}`);
  } else {
    priceLines.push("Gold price: unavailable on this run.");
  }
  const eventLines = today.length
    ? today.map((event) => `• ${escHtml(event.london_time)} UK — ${escHtml(event.title)} (${escHtml(event.impact)}) — forecast ${escHtml(event.forecast || "n/a")}, previous ${escHtml(event.previous || "n/a")}`)
    : ["Nothing dated today in the calendar feed."];
  const headlines = (news?.items || []).slice(0, 5);
  const newsLines = headlines.length
    ? headlines.map(headlineLine)
    : ["No headlines in the latest fetch."];
  const text = [
    "<b>Gold Radar · Morning digest</b>",
    `${escHtml(londonDate)} · morning note, scheduled for 07:00 UK`,
    "",
    "<b>Gold price</b>",
    ...priceLines,
    "",
    "<b>Today on the calendar</b>",
    ...eventLines,
    "",
    "<b>Top headlines</b>",
    "Quoted from the publisher named after each title. Not a call from this desk. Tone is a keyword reading of the headline, not a forecast.",
    ...newsLines,
    "",
    `Dashboard: ${escHtml(DASHBOARD)}`,
  ].join("\n");
  return clipMessage(`${text}${footer()}`);
}

function briefList(title, items) {
  if (!items.length) return `${title}\n• none listed`;
  return [title, ...items.map((item) => `• ${escHtml(clip(item, 240))}`)].join("\n");
}

export function messageBrief(brief) {
  const links = (brief.sources || []).slice(0, 5).map((source) => {
    const safeUrl = String(source.url || "");
    if (!/^https?:\/\//i.test(safeUrl)) return `• ${escHtml(source.title)}`;
    return `• <a href="${escHtml(safeUrl)}">${escHtml(clip(source.title, 80))}</a>`;
  });
  const summary = escHtml(clip(brief.summary_markdown.replace(/\s+/g, " ").trim(), 700));
  const text = [
    `<b>Gold Radar · Research brief</b>`,
    `${escHtml(brief.type.replace("_", " "))} · ${escHtml(formatWhen(brief.created_utc))}`,
    "",
    `<b>${escHtml(clip(brief.title, 180))}</b>`,
    summary,
    "",
    briefList("<b>Bull case</b> (arguments in the note, not a recommendation)", brief.bull_case || []),
    "",
    briefList("<b>Bear case</b> (arguments in the note, not a recommendation)", brief.bear_case || []),
    brief.key_levels_watched_by_market_text
      ? `\n<b>Levels mentioned in market commentary</b>\n${escHtml(clip(brief.key_levels_watched_by_market_text, 300))}\nThese are not entry, exit, target or stop levels.`
      : "",
    "",
    "<b>Sources</b>",
    ...links,
    "",
    `Dashboard: ${escHtml(DASHBOARD)}`,
  ].filter((part) => part !== "").join("\n");
  return clipMessage(`${text}${footer()}`);
}

export function clipMessage(text) {
  if (text.length <= 4000) return text;
  const tail = `\n\n${DISCLAIMER}`;
  return `${text.slice(0, 4000 - tail.length - 1).trimEnd()}…${tail}`;
}

export function renderAlert(alert, context) {
  if (alert.kind === "pre60" || alert.kind === "pre15") {
    return messagePre({ kind: alert.kind, event: alert.event, minutes: alert.minutes });
  }
  if (alert.kind === "post") return messagePost(alert.event);
  if (alert.kind === "digest") {
    return messageDigest({
      now: context.now,
      price: context.price,
      calendar: context.calendar,
      news: context.news,
    });
  }
  if (alert.kind === "brief") return messageBrief(alert.brief);
  throw new Error(`Unknown alert kind ${alert.kind}`);
}
