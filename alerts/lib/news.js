import { clip, hashId, utcIso } from "./util.js";
import { getText } from "./http.js";

const PHRASES = [
  ["bull", "safe haven"],
  ["bull", "safe-haven"],
  ["bull", "haven demand"],
  ["bull", "haven bid"],
  ["bull", "record high"],
  ["bull", "all-time high"],
  ["bull", "all time high"],
  ["bull", "rate cut"],
  ["bull", "rate cuts"],
  ["bull", "cuts rates"],
  ["bull", "weak dollar"],
  ["bull", "dollar falls"],
  ["bull", "dollar weakens"],
  ["bull", "dollar slides"],
  ["bull", "dollar drops"],
  ["bull", "yields fall"],
  ["bull", "yields drop"],
  ["bull", "yields ease"],
  ["bull", "yields lower"],
  ["bull", "central-bank buying"],
  ["bull", "central bank buying"],
  ["bull", "etf inflows"],
  ["bull", "etf inflow"],
  ["bear", "rate hike"],
  ["bear", "rate hikes"],
  ["bear", "hikes rates"],
  ["bear", "strong dollar"],
  ["bear", "dollar rises"],
  ["bear", "dollar strengthens"],
  ["bear", "dollar surges"],
  ["bear", "dollar gains"],
  ["bear", "yields rise"],
  ["bear", "yields climb"],
  ["bear", "yields higher"],
  ["bear", "etf outflows"],
  ["bear", "etf outflow"],
  ["bear", "selling pressure"],
  ["bear", "sell-off"],
  ["bear", "selloff"],
];

const WORDS = [
  ["bull", "rally"],
  ["bull", "rallies"],
  ["bull", "surges"],
  ["bull", "surge"],
  ["bull", "soars"],
  ["bull", "soar"],
  ["bull", "jumps"],
  ["bull", "climbs"],
  ["bull", "rebounds"],
  ["bull", "rebound"],
  ["bull", "gains"],
  ["bull", "rises"],
  ["bull", "rising"],
  ["bull", "advances"],
  ["bull", "dovish"],
  ["bull", "bullish"],
  ["bull", "geopolitical"],
  ["bear", "falls"],
  ["bear", "lose"],
  ["bear", "loses"],
  ["bear", "losing"],
  ["bear", "plunge"],
  ["bear", "plunges"],
  ["bear", "tumbled"],
  ["bear", "tumbling"],
  ["bear", "drops"],
  ["bear", "dropped"],
  ["bear", "drop"],
  ["bear", "slips"],
  ["bear", "slip"],
  ["bear", "slide"],
  ["bear", "slump"],
  ["bear", "sinks"],
  ["bear", "slides"],
  ["bear", "tumbles"],
  ["bear", "plunges"],
  ["bear", "slumps"],
  ["bear", "declines"],
  ["bear", "retreats"],
  ["bear", "hawkish"],
  ["bear", "bearish"],
  ["bear", "weakness"],
];

const FEEDS = [
  {
    id: "google-news-gold",
    name: "Google News (gold)",
    url: "https://news.google.com/rss/search?q=gold+price+OR+XAUUSD&hl=en-GB&gl=GB&ceid=GB:en",
    filter: "gold",
  },
  {
    id: "investing-commodities",
    name: "Investing.com commodities",
    url: "https://www.investing.com/rss/news_11.rss",
    filter: "gold",
  },
  {
    id: "kitco",
    name: "Kitco",
    url: "https://news.kitco.com/feed",
    filter: "gold",
  },
  {
    id: "fxstreet-gold",
    name: "FXStreet gold",
    url: "https://www.fxstreet.com/rss/gold",
    filter: "gold",
  },
  {
    id: "reuters-business",
    name: "Reuters business",
    url: "https://feeds.reuters.com/reuters/businessNews",
    filter: "gold",
  },
];

export function scoreTone(title) {
  const hay = String(title || "").toLowerCase();
  let working = hay;
  const bullish = [];
  const bearish = [];
  const phrases = [...PHRASES].sort((a, b) => b[1].length - a[1].length);
  for (const [side, phrase] of phrases) {
    if (!working.includes(phrase)) continue;
    (side === "bull" ? bullish : bearish).push(phrase);
    working = working.split(phrase).join(" ");
  }
  for (const [side, word] of WORDS) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (!re.test(working)) continue;
    (side === "bull" ? bullish : bearish).push(word);
  }
  const score = bullish.length - bearish.length;
  const tone = score > 0 ? "bullish" : score < 0 ? "bearish" : "neutral";
  return { tone, tone_score: score, tone_hits: { bullish, bearish } };
}

export function decodeEntities(value) {
  let text = String(value ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let pass = 0; pass < 2; pass += 1) {
    text = text
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)));
  }
  return text;
}

function stripTags(value) {
  const decoded = decodeEntities(String(value));
  return decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const match = block.match(re);
  return match ? stripTags(match[1]) : "";
}

function attr(block, name, attribute) {
  const re = new RegExp(`<${name}[^>]*\\s${attribute}="([^"]*)"`, "i");
  const match = block.match(re);
  return match ? decodeEntities(match[1]) : "";
}

export function parseFeed(xml) {
  const text = String(xml || "");
  if (!/<(rss|feed|channel)\b/i.test(text)) return [];
  const blocks = text.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  const items = [];
  for (const block of blocks) {
    const rawTitle = tag(block, "title");
    const link = tag(block, "link") || attr(block, "link", "href");
    const published = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date");
    const summary = tag(block, "description") || tag(block, "summary") || tag(block, "content");
    if (!rawTitle) continue;
    items.push({
      title: rawTitle,
      url: link,
      published_raw: published,
      summary,
      source_tag: tag(block, "source"),
    });
  }
  return items;
}

export function splitPublisher(title) {
  const idx = title.lastIndexOf(" - ");
  if (idx >= 8) {
    const publisher = title.slice(idx + 3).trim();
    const words = publisher.split(/\s+/).filter(Boolean);
    if (publisher && publisher.length <= 40 && words.length <= 4 && !/\bgold\b|\bxau\b/i.test(publisher)) {
      return { title: title.slice(0, idx).trim(), publisher };
    }
  }
  return { title: title.trim(), publisher: "" };
}

function goldRelevant(title) {
  return /\bgold\b|\bxau\b|bullion|precious metals?/i.test(title);
}

function cleanSummary(summary, title) {
  const text = clip(summary, 280);
  if (!text) return "";
  const norm = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
  if (norm(text) === norm(title) || norm(text).startsWith(norm(title))) {
    const rest = text.slice(title.length).replace(/^[\s\-|–—:]+/, "").trim();
    if (rest.length < 40) return "";
    return clip(rest, 280);
  }
  return text;
}

function normKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function prepareItems(rawItems, feed, now) {
  const prepared = [];
  for (const raw of rawItems) {
    const split = splitPublisher(raw.title);
    const title = split.title;
    if (!title || !goldRelevant(title)) continue;
    const published = raw.published_raw ? new Date(raw.published_raw) : null;
    const publishedOk = published && !Number.isNaN(published.getTime());
    if (publishedOk && now.getTime() - published.getTime() > 6 * 24 * 60 * 60 * 1000) continue;
    const tone = scoreTone(title);
    const summary = cleanSummary(raw.summary, title);
    prepared.push({
      id: hashId(raw.url || title),
      title,
      url: /^https?:\/\//i.test(raw.url || "") ? raw.url : "",
      source: raw.source_tag || split.publisher || feed.name,
      feed_id: feed.id,
      feed_name: feed.name,
      published_utc: publishedOk ? utcIso(published) : null,
      summary,
      ...tone,
    });
  }
  return prepared;
}

export function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = normKey(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function overallTone(items) {
  const counts = { bullish: 0, bearish: 0, neutral: 0 };
  for (const item of items) counts[item.tone] += 1;
  const total = items.length || 1;
  let label = "neutral";
  if (counts.bullish > counts.bearish && counts.bullish > counts.neutral) label = "bullish";
  else if (counts.bearish > counts.bullish && counts.bearish > counts.neutral) label = "bearish";
  return {
    label,
    ...counts,
    net_score: Number(((counts.bullish - counts.bearish) / total).toFixed(3)),
    method: "Distinct bullish keywords minus distinct bearish keywords in each headline. This is headline tone, not a forecast.",
  };
}

export async function fetchNews(now = new Date()) {
  const attempts = [];
  const collected = [];
  for (const feed of FEEDS) {
    const res = await getText(feed.url, { accept: "application/rss+xml, application/xml, text/xml, */*" });
    const attempt = {
      id: feed.id,
      name: feed.name,
      url: feed.url,
      status: res.status,
      ok: false,
      items: 0,
      error: res.error,
    };
    if (!res.ok) {
      attempts.push(attempt);
      continue;
    }
    const parsed = parseFeed(res.text);
    if (!parsed.length) {
      attempt.error = /<(rss|feed)\b/i.test(res.text) ? "feed contained no items" : "response was not an RSS or Atom feed";
      attempts.push(attempt);
      continue;
    }
    const items = prepareItems(parsed, feed, now);
    attempt.ok = true;
    attempt.error = null;
    attempt.items = items.length;
    attempt.parsed = parsed.length;
    attempts.push(attempt);
    collected.push(...items);
  }
  const items = dedupe(collected)
    .sort((a, b) => String(b.published_utc || "").localeCompare(String(a.published_utc || "")))
    .slice(0, 30);
  const ok = items.length > 0;
  return {
    ok,
    fetched_utc: utcIso(now),
    tone_label: "Headline tone",
    tone_disclaimer: "Keyword reading of the headline only. Not a forecast, not a rating, and not a view from GrokGold.",
    overall: overallTone(items),
    feeds: attempts,
    items,
    error: ok ? null : "No gold headlines were collected.",
  };
}
