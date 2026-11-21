import fs from "node:fs";
import path from "node:path";
import { utcIso } from "./util.js";

const TYPES = new Set(["daily", "pre_event", "post_event"]);

const INSTRUCTION = [
  /\b(buy|sell)\s+(gold|xau|xauusd)\b/i,
  /\b(go long|go short)\b/i,
  /\bentry (at|zone|price)\b/i,
  /\bstop[- ]loss\b/i,
  /\btake[- ]profit\b/i,
  /\bposition size\b/i,
  /\bprice target\b/i,
];

export function instructionHit(text) {
  const hay = String(text || "");
  return INSTRUCTION.find((re) => re.test(hay))?.source || null;
}

function asStringList(value, field, errors) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`${field} must be an array of non-empty strings`);
    return [];
  }
  return value.map((item) => item.trim());
}

export function validateBrief(raw, file) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, file, errors: ["brief must be a JSON object"] };
  }
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const summary = typeof raw.summary_markdown === "string" ? raw.summary_markdown.trim() : "";
  const created = typeof raw.created_utc === "string" ? new Date(raw.created_utc) : null;
  if (!id) errors.push("id is required");
  if (!title) errors.push("title is required");
  if (!summary) errors.push("summary_markdown is required");
  if (!TYPES.has(raw.type)) errors.push("type must be daily, pre_event or post_event");
  if (!created || Number.isNaN(created.getTime())) errors.push("created_utc must be an ISO date");
  const bull = asStringList(raw.bull_case, "bull_case", errors);
  const bear = asStringList(raw.bear_case, "bear_case", errors);
  let sources = [];
  if (!Array.isArray(raw.sources)) {
    errors.push("sources must be an array");
  } else {
    sources = raw.sources.map((source, index) => {
      const sourceTitle = typeof source?.title === "string" ? source.title.trim() : "";
      const url = typeof source?.url === "string" ? source.url.trim() : "";
      if (!sourceTitle) errors.push(`sources[${index}].title is required`);
      if (!/^https?:\/\//i.test(url)) errors.push(`sources[${index}].url must be http(s)`);
      return { title: sourceTitle, url };
    });
  }
  const levels = raw.key_levels_watched_by_market_text;
  if (levels != null && typeof levels !== "string") {
    errors.push("key_levels_watched_by_market_text must be a string when present");
  }
  if (errors.length) return { ok: false, file, id, errors };

  const brief = {
    id,
    created_utc: utcIso(created),
    type: raw.type,
    title,
    summary_markdown: summary,
    bull_case: bull,
    bear_case: bear,
    sources,
    example: raw.example === true,
    file: path.basename(file || ""),
  };
  if (typeof levels === "string" && levels.trim()) {
    brief.key_levels_watched_by_market_text = levels.trim();
  }
  const scan = [
    brief.title,
    brief.summary_markdown,
    ...brief.bull_case,
    ...brief.bear_case,
    brief.key_levels_watched_by_market_text || "",
  ].join("\n");
  const hit = instructionHit(scan);
  if (hit) {
    brief.held = true;
    brief.hold_reason = "Held back because the text reads like a trade instruction. GrokGold Desk does not publish buy or sell calls, entries, exits, targets, stops or position sizes.";
    brief.summary_markdown = brief.hold_reason;
    brief.bull_case = [];
    brief.bear_case = [];
    delete brief.key_levels_watched_by_market_text;
  } else {
    brief.held = false;
  }
  return { ok: true, brief };
}

export function loadBriefs(dir, now = new Date()) {
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort()
    : [];
  const briefs = [];
  const rejected = [];
  for (const name of files) {
    const file = path.join(dir, name);
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
      rejected.push({ file: name, errors: [`JSON parse failed: ${err.message}`] });
      continue;
    }
    const result = validateBrief(raw, file);
    if (!result.ok) {
      rejected.push({ file: name, errors: result.errors });
      continue;
    }
    briefs.push(result.brief);
  }
  briefs.sort((a, b) => b.created_utc.localeCompare(a.created_utc) || b.id.localeCompare(a.id));
  return {
    updated_utc: utcIso(now),
    count: briefs.length,
    rejected,
    briefs,
  };
}
