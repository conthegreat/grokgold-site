import assert from "node:assert/strict";
import { selectEvents, whyGoldWatchersFollow } from "./lib/calendar.js";
import { changeOver24h, floorTo15 } from "./lib/price.js";
import { dedupe, overallTone, parseFeed, prepareItems, scoreTone } from "./lib/news.js";
import { instructionHit, validateBrief } from "./lib/briefs.js";
import { classifyPre } from "./lib/decide.js";
import { compareActual, messagePost, messagePre } from "./lib/messages.js";
import { DISCLAIMER, escHtml, londonParts } from "./lib/util.js";
import { deliverAlerts } from "./telegram.js";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("london winter and summer offsets", () => {
  const winter = londonParts(new Date("2026-11-21T12:00:00Z"));
  assert.equal(winter.date, "2026-11-21");
  assert.equal(winter.time, "12:00");
  assert.equal(winter.offset, "+00:00");
  const summer = londonParts(new Date("2026-07-01T12:00:00Z"));
  assert.equal(summer.date, "2026-07-01");
  assert.equal(summer.time, "13:00");
  assert.equal(summer.offset, "+01:00");
});

check("calendar keeps USD high and medium, gold titles, and drops USD low", () => {
  const events = selectEvents([
    { title: "Core Retail Sales m/m", country: "USD", date: "2026-11-17T08:30:00-05:00", impact: "High", forecast: "0.4%", previous: "0.9%" },
    { title: "Unemployment Claims", country: "USD", date: "2026-11-19T08:30:00-05:00", impact: "Medium", forecast: "198K", previous: "200K" },
    { title: "FOMC Member Barr Speaks", country: "USD", date: "2026-11-16T05:00:00-05:00", impact: "Low", forecast: "", previous: "" },
    { title: "China gold reserves", country: "CNY", date: "2026-11-18T02:00:00-05:00", impact: "Low", forecast: "", previous: "" },
    { title: "CPI m/m", country: "CAD", date: "2026-11-16T08:30:00-05:00", impact: "High", forecast: "0.2%", previous: "0.1%" },
  ]);
  const titles = events.map((event) => event.title);
  assert.deepEqual(titles, ["Core Retail Sales m/m", "China gold reserves", "Unemployment Claims"]);
  assert.equal(events[0].time_utc, "2026-11-17T13:30:00Z");
  assert.equal(events[0].london_time, "13:30");
  assert.match(events[0].why_gold_watchers_follow, /Nothing here is a view on what gold will do next/);
  assert.doesNotMatch(whyGoldWatchersFollow(events[0]), /\b(buy|sell|entry|stop)\b/i);
});

check("tone scores headlines and ignores a mixed phrase double count", () => {
  assert.equal(scoreTone("Gold surges as the dollar slides").tone, "bullish");
  assert.equal(scoreTone("Gold tumbles as the dollar surges").tone, "bearish");
  assert.equal(scoreTone("Gold price today").tone, "neutral");
  const mixed = scoreTone("Gold slides as the dollar slides");
  assert.equal(mixed.tone, "neutral");
  assert.deepEqual(mixed.tone_hits.bullish, ["dollar slides"]);
  assert.ok(mixed.tone_hits.bearish.includes("slides"));
});

check("rss parse, gold filter and dedupe", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item><title><![CDATA[Gold rallies - Kitco]]></title><link>https://example.com/a</link><pubDate>Sat, 21 Nov 2026 12:00:00 GMT</pubDate></item>
    <item><title>Gold rallies - Other</title><link>https://example.com/b</link><pubDate>Sat, 21 Nov 2026 12:05:00 GMT</pubDate></item>
    <item><title>Oil prices settle lower</title><link>https://example.com/c</link><pubDate>Sat, 21 Nov 2026 12:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const parsed = parseFeed(xml);
  assert.equal(parsed.length, 3);
  const items = dedupe(prepareItems(parsed, { id: "t", name: "Test" }, new Date("2026-11-21T13:00:00Z")));
  assert.equal(items.length, 1);
  assert.equal(items[0].tone, "bullish");
  assert.equal(overallTone(items).label, "bullish");
});

check("24h change and 15-minute buckets", () => {
  assert.equal(floorTo15(new Date("2026-11-21T22:11:08Z")), "2026-11-21T22:00:00Z");
  const change = changeOver24h([
    { t: "2026-11-19T21:45:00Z", price: 3627.9 },
    { t: "2026-11-20T21:45:00Z", price: 3515.4 },
  ]);
  assert.equal(change.amount, -112.5);
  assert.equal(change.percent, -3.1);
  assert.equal(changeOver24h([{ t: "2026-11-21T22:00:00Z", price: 1 }]), null);
});

check("alert windows do not overlap and do not fire late", () => {
  assert.equal(classifyPre(60), "pre60");
  assert.equal(classifyPre(80), "pre60");
  assert.equal(classifyPre(30), "pre15");
  assert.equal(classifyPre(15), "pre15");
  assert.equal(classifyPre(81), null);
  assert.equal(classifyPre(0), null);
  assert.equal(classifyPre(-5), null);
});

check("actual comparison stays a figure comparison", () => {
  assert.match(compareActual("0.4%", "0.3%"), /above the consensus forecast/);
  assert.match(compareActual("198K", "200K"), /below the consensus forecast/);
  assert.match(compareActual("0.4%", "198K"), /not available/);
  const text = messagePost({
    title: "Core Retail Sales m/m",
    country: "USD",
    impact: "High",
    time_utc: "2026-11-17T13:30:00Z",
    forecast: "0.4%",
    previous: "0.9%",
    actual: "0.2%",
    why_gold_watchers_follow: "Activity releases are watched. Nothing here is a view on what gold will do next.",
  });
  assert.ok(text.endsWith(DISCLAIMER));
  assert.equal(text.split(DISCLAIMER).length, 2);
  assert.match(text, /Actual \(calendar feed\): 0\.2%/);
  assert.doesNotMatch(text, /\b(buy|sell|entry|stop-loss|position size)\b/i);
});

check("telegram HTML is escaped", () => {
  const text = messagePre({
    kind: "pre60",
    minutes: 58,
    event: {
      title: "CPI <script>",
      country: "USD",
      impact: "High",
      time_utc: "2026-11-17T13:30:00Z",
      forecast: "1 < 2",
      previous: "",
      why_gold_watchers_follow: "Watched & discussed. Nothing here is a view on what gold will do next.",
    },
  });
  assert.match(text, /CPI &lt;script&gt;/);
  assert.match(text, /1 &lt; 2/);
  assert.match(text, /Watched &amp; discussed/);
  assert.ok(text.endsWith(DISCLAIMER));
  assert.equal(escHtml(`a&b<c>`), "a&amp;b&lt;c&gt;");
});

check("briefs reject trade instructions and accept the schema", () => {
  const good = validateBrief({
    id: "ok",
    created_utc: "2026-11-21T07:00:00Z",
    type: "daily",
    title: "Sample",
    summary_markdown: "A description.",
    bull_case: ["One theme."],
    bear_case: ["Another theme."],
    sources: [{ title: "Feed", url: "https://example.com/feed" }],
    example: true,
  }, "sample.json");
  assert.equal(good.ok, true);
  assert.equal(good.brief.held, false);
  const bad = validateBrief({
    id: "bad",
    created_utc: "2026-11-21T07:00:00Z",
    type: "daily",
    title: "Do this",
    summary_markdown: "Please buy gold at the open.",
    bull_case: ["Theme."],
    bear_case: ["Theme."],
    sources: [{ title: "Feed", url: "https://example.com/feed" }],
  }, "bad.json");
  assert.equal(bad.ok, true);
  assert.equal(bad.brief.held, true);
  assert.deepEqual(bad.brief.bull_case, []);
  assert.ok(instructionHit("stop-loss at 3500"));
});

const dry = await deliverAlerts(
  [{ key: "pre60:test", text: `Notice\n\n${DISCLAIMER}` }],
  { token: "", chatId: "", dryRun: true }
);
assert.equal(dry[0].dryRun, true);
assert.equal(dry[0].ok, true);
passed += 1;
console.log("ok  dry-run delivery does not pretend to send");

const sourced = prepareItems([
  { title: "Gold price today - Kitco", url: "https://example.com/g", published_raw: "Sat, 21 Nov 2026 12:00:00 GMT", summary: "", source_tag: "Kitco" },
], { id: "g", name: "Google" }, new Date("2026-11-21T18:00:00Z"));
assert.equal(sourced[0].source, "Kitco");
assert.equal(sourced[0].tone, "neutral");
passed += 1;
console.log("ok  publisher tag is kept");

console.log(`\n${passed} checks passed`);
