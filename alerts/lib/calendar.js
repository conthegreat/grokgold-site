import { blank, londonParts, utcIso } from "./util.js";
import { getText } from "./http.js";

export const CALENDAR_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

const GOLD_TITLE = /\bgold\b|\bxau\b|bullion|precious metals?/i;

export function isGoldTitle(title) {
  return GOLD_TITLE.test(title || "");
}

export function isUsdHighOrMedium(event) {
  return event.country === "USD" && (event.impact === "High" || event.impact === "Medium");
}

export function includeEvent(event) {
  return isUsdHighOrMedium(event) || isGoldTitle(event.title);
}

export function eventId(event) {
  return `${event.country}|${event.title}|${event.time_utc}`;
}

export function whyGoldWatchersFollow(event) {
  const title = `${event.title || ""}`;
  const t = title.toLowerCase();
  let reason;
  if (isGoldTitle(title)) {
    reason = "The title refers to gold or precious metals, so it sits in the set of releases gold research desks read.";
  } else if (/fomc|fed chair|federal reserve|powell|warsh|rate decision|interest rate|\bminutes\b/.test(t)) {
    reason = "Gold research often follows Federal Reserve policy events because rate expectations and the US dollar are widely discussed alongside XAUUSD. That link is not fixed from one release to the next.";
  } else if (/\bcpi\b|\bpce\b|\bppi\b|inflation/.test(t)) {
    reason = "Inflation prints are widely watched by gold desks because they feed the public debate on interest rates and real yields.";
  } else if (/payroll|non-farm|nonfarm|unemployment|jobless|claims/.test(t)) {
    reason = "US labour data is widely watched because it feeds expectations for Federal Reserve policy, which gold commentary often discusses next to the dollar.";
  } else if (/retail sales|\bgdp\b|\bism\b|\bpmi\b|confidence|sentiment|housing/.test(t)) {
    reason = "Activity and sentiment releases sit on many gold calendars because they can shift the public discussion of US rates and the dollar.";
  } else if (/speak|speech|remarks|testif/.test(t)) {
    reason = "Remarks from US officials are followed because they can change how the market discusses the path of interest rates and the dollar.";
  } else {
    reason = "It is a US dollar release at this impact level. Gold commentary often treats the dollar and US yields as cross-market context for XAUUSD.";
  }
  return `${reason} Nothing here is a view on what gold will do next.`;
}

function normaliseImpact(value) {
  const s = String(value || "").trim().toLowerCase();
  if (s === "high") return "High";
  if (s === "medium") return "Medium";
  if (s === "low") return "Low";
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function normaliseEvent(raw) {
  const when = new Date(raw?.date);
  if (Number.isNaN(when.getTime())) return null;
  const london = londonParts(when);
  const event = {
    title: String(raw.title || "").trim(),
    country: String(raw.country || "").trim().toUpperCase(),
    impact: normaliseImpact(raw.impact),
    forecast: blank(raw.forecast),
    previous: blank(raw.previous),
    actual: blank(raw.actual),
    time_utc: utcIso(when),
    time_london: london.iso,
    london_date: london.date,
    london_time: london.time,
    london_offset: london.offset,
  };
  if (!event.title || !event.country) return null;
  event.id = eventId(event);
  event.gold_title = isGoldTitle(event.title);
  event.included_because = isUsdHighOrMedium(event)
    ? (event.gold_title ? "USD high or medium impact, and the title mentions gold" : "USD high or medium impact")
    : "Title mentions gold or precious metals";
  event.why_gold_watchers_follow = whyGoldWatchersFollow(event);
  return event;
}

export function selectEvents(rawList) {
  if (!Array.isArray(rawList)) return [];
  const events = [];
  for (const raw of rawList) {
    const event = normaliseEvent(raw);
    if (!event || !includeEvent(event)) continue;
    events.push(event);
  }
  events.sort((a, b) => a.time_utc.localeCompare(b.time_utc) || a.title.localeCompare(b.title));
  return events;
}

export async function fetchCalendar(now = new Date()) {
  const attempt = { source: "Forex Factory weekly JSON", url: CALENDAR_URL };
  const res = await getText(CALENDAR_URL, { accept: "application/json" });
  attempt.status = res.status;
  attempt.ok = false;
  attempt.error = res.error;
  if (!res.ok) {
    return {
      ok: false,
      source: attempt.source,
      source_url: CALENDAR_URL,
      fetched_utc: utcIso(now),
      feed_includes_actual: false,
      note: "The calendar feed did not respond. The previous file is kept when one exists.",
      attempts: [attempt],
      events: [],
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(res.text);
  } catch (err) {
    attempt.error = `JSON parse failed: ${err.message}`;
    return {
      ok: false,
      source: attempt.source,
      source_url: CALENDAR_URL,
      fetched_utc: utcIso(now),
      feed_includes_actual: false,
      note: "The calendar feed was not valid JSON.",
      attempts: [attempt],
      events: [],
    };
  }
  const events = selectEvents(parsed);
  const rawCount = Array.isArray(parsed) ? parsed.length : 0;
  const sample = Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  const feedIncludesActual = sample.some((row) => Object.prototype.hasOwnProperty.call(row, "actual"))
    || events.some((event) => event.actual);
  attempt.ok = true;
  attempt.error = null;
  attempt.raw_events = rawCount;
  attempt.kept_events = events.length;
  const dates = events.map((event) => event.london_date);
  return {
    ok: true,
    source: attempt.source,
    source_url: CALENDAR_URL,
    fetched_utc: utcIso(now),
    feed_includes_actual: feedIncludesActual,
    actuals_note: feedIncludesActual
      ? "The feed included an actual field on at least one row."
      : "This fetch did not include an actual field. Post-release alerts wait until a non-empty actual is present. Forecast and previous are the calendar vendor's published figures, not GrokGold estimates.",
    filter: "USD high-impact and USD medium-impact events, plus any event whose title mentions gold, XAU, bullion or precious metals.",
    week_london_start: dates[0] || null,
    week_london_end: dates[dates.length - 1] || null,
    attempts: [attempt],
    events,
  };
}
