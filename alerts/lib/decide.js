import { londonParts } from "./util.js";

export function classifyPre(minutesUntil) {
  if (minutesUntil > 30 && minutesUntil <= 80) return "pre60";
  if (minutesUntil > 0 && minutesUntil <= 30) return "pre15";
  return null;
}

export function inDigestWindow(date) {
  const london = londonParts(date);
  const hour = Number(london.hour);
  const minute = Number(london.minute);
  return hour === 7 || (hour === 8 && minute < 30);
}

export function dueAlerts({ now, calendar, previousEvents, briefs, state }) {
  const sent = new Set(Object.keys(state?.sent || {}));
  const previousActual = new Map((previousEvents || []).map((event) => [event.id, event.actual || ""]));
  const due = [];
  for (const event of calendar?.events || []) {
    if (!(event.country === "USD" && event.impact === "High")) continue;
    const minutes = (new Date(event.time_utc).getTime() - now.getTime()) / 60000;
    const pre = classifyPre(minutes);
    if (pre) {
      const key = `${pre}:${event.id}`;
      if (!sent.has(key)) due.push({ key, kind: pre, event, minutes });
    }
    const actual = (event.actual || "").trim();
    const before = (previousActual.get(event.id) || "").trim();
    const ageHours = (now.getTime() - new Date(event.time_utc).getTime()) / 36e5;
    const recent = ageHours >= -0.25 && ageHours <= 36;
    if (actual && !before && recent) {
      const key = `post:${event.id}`;
      if (!sent.has(key)) due.push({ key, kind: "post", event });
    }
  }
  const london = londonParts(now);
  if (inDigestWindow(now)) {
    const key = `digest:${london.date}`;
    if (!sent.has(key)) due.push({ key, kind: "digest", london_date: london.date });
  }
  for (const brief of briefs?.briefs || []) {
    if (brief.example || brief.held) continue;
    const key = `brief:${brief.id}`;
    if (!sent.has(key)) due.push({ key, kind: "brief", brief });
  }
  return due;
}
