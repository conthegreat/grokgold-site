import { formatUsd, round2, signed, utcIso } from "./util.js";
import { getText } from "./http.js";

export const SPOT_URL = "https://api.gold-api.com/price/XAU";
export const GOLDPRICE_URL = "https://data-asg.goldprice.org/dbXRates/USD";
export const YAHOO_CHART_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=15m&range=7d";

const FIFTEEN_MIN = 15 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

export function floorTo15(date) {
  const bucket = Math.floor(date.getTime() / FIFTEEN_MIN) * FIFTEEN_MIN;
  return utcIso(bucket);
}

export function trimPoints(points, now, days = 7) {
  const cutoff = now.getTime() - days * DAY;
  return points
    .filter((point) => Number.isFinite(point.price) && new Date(point.t).getTime() >= cutoff)
    .sort((a, b) => a.t.localeCompare(b.t));
}

export function upsertPoint(points, point) {
  const next = points.filter((row) => row.t !== point.t);
  next.push(point);
  next.sort((a, b) => a.t.localeCompare(b.t));
  return next;
}

export function changeOver24h(points) {
  const usable = (points || []).filter((point) => Number.isFinite(point.price));
  if (usable.length < 2) return null;
  const end = usable[usable.length - 1];
  const endMs = new Date(end.t).getTime();
  const target = endMs - DAY;
  let best = null;
  let bestAbs = Infinity;
  for (const point of usable) {
    const delta = Math.abs(new Date(point.t).getTime() - target);
    if (delta < bestAbs) {
      best = point;
      bestAbs = delta;
    }
  }
  if (!best || best.t === end.t || bestAbs > 45 * 60 * 1000) return null;
  const amount = round2(end.price - best.price);
  const percent = round2(((end.price - best.price) / best.price) * 100);
  return {
    from_utc: best.t,
    to_utc: end.t,
    from_price: best.price,
    to_price: end.price,
    amount,
    percent,
  };
}

function parseGoldApi(text) {
  const body = JSON.parse(text);
  const price = Number(body.price);
  if (!Number.isFinite(price)) throw new Error("price missing");
  return {
    price: round2(price),
    provider_time_utc: body.updatedAt ? utcIso(body.updatedAt) : null,
    currency: body.currency || "USD",
    name: body.name || "Gold",
    symbol: body.symbol || "XAU",
  };
}

function parseGoldPriceOrg(text) {
  const body = JSON.parse(text);
  const item = body.items?.find((row) => row.curr === "USD") || body.items?.[0];
  const price = Number(item?.xauPrice);
  if (!Number.isFinite(price)) throw new Error("xauPrice missing");
  return {
    price: round2(price),
    provider_time_utc: body.ts ? utcIso(Number(body.ts) * 1000) : null,
    currency: "USD",
    name: "Gold",
    symbol: "XAU",
  };
}

function parseYahooChart(text) {
  const body = JSON.parse(text);
  const result = body?.chart?.result?.[0];
  if (!result) throw new Error(body?.chart?.error?.description || "no chart result");
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const points = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = closes[i];
    if (!Number.isFinite(close)) continue;
    points.push({ t: utcIso(timestamps[i] * 1000), price: round2(close) });
  }
  const meta = result.meta || {};
  const last = Number(meta.regularMarketPrice);
  return {
    price: Number.isFinite(last) ? round2(last) : points.at(-1)?.price ?? null,
    provider_time_utc: meta.regularMarketTime ? utcIso(meta.regularMarketTime * 1000) : points.at(-1)?.t || null,
    currency: meta.currency || "USD",
    name: meta.shortName || "Gold futures",
    symbol: meta.symbol || "GC=F",
    instrument_type: meta.instrumentType || "FUTURE",
    points,
  };
}

async function attempt(name, url, parse) {
  const res = await getText(url, { accept: "application/json" });
  const row = { source: name, url, status: res.status, ok: false, error: res.error };
  if (!res.ok) return { row, data: null };
  try {
    const data = parse(res.text);
    row.ok = true;
    row.error = null;
    return { row, data };
  } catch (err) {
    row.error = err.message;
    return { row, data: null };
  }
}

export function emptyHistory() {
  return {
    updated_utc: null,
    interval_minutes: 15,
    retention_days: 7,
    spot: {
      symbol: "XAUUSD",
      unit: "USD per troy ounce",
      points: [],
    },
    chart: {
      symbol: "GC=F",
      label: "COMEX gold futures, front month. Not the spot price.",
      source: "Yahoo Finance chart API",
      source_url: YAHOO_CHART_URL,
      points: [],
    },
  };
}

export async function fetchPrice(previousHistory, now = new Date()) {
  const attempts = [];
  const spotAttempt = await attempt("api.gold-api.com", SPOT_URL, parseGoldApi);
  attempts.push(spotAttempt.row);

  let spot = spotAttempt.data;
  let spotSource = "api.gold-api.com";
  let spotUrl = SPOT_URL;
  let fallbackUsed = null;
  let instrumentLabel = "Gold spot price, US dollars per troy ounce";

  if (!spot) {
    const org = await attempt("goldprice.org", GOLDPRICE_URL, parseGoldPriceOrg);
    attempts.push(org.row);
    if (org.data) {
      spot = org.data;
      spotSource = "goldprice.org";
      spotUrl = GOLDPRICE_URL;
      fallbackUsed = "goldprice.org";
    }
  }

  const yahoo = await attempt("Yahoo Finance GC=F 15-minute chart", YAHOO_CHART_URL, parseYahooChart);
  attempts.push({ ...yahoo.row, points: yahoo.data?.points?.length || 0 });

  if (!spot && yahoo.data?.price) {
    spot = yahoo.data;
    spotSource = "Yahoo Finance GC=F";
    spotUrl = YAHOO_CHART_URL;
    fallbackUsed = "Yahoo Finance GC=F (COMEX futures proxy, not spot)";
    instrumentLabel = "COMEX gold futures front month (GC=F), because the spot sources did not respond. This is not the spot price.";
  }

  const history = previousHistory?.spot ? structuredClone(previousHistory) : emptyHistory();
  if (!Array.isArray(history.spot?.points)) history.spot = emptyHistory().spot;
  if (!Array.isArray(history.chart?.points)) history.chart = emptyHistory().chart;

  if (yahoo.data?.points?.length) {
    history.chart = {
      symbol: "GC=F",
      label: "COMEX gold futures, front month (GC=F). Not the spot price. Used for the 15-minute chart because no keyless spot-history endpoint responded.",
      source: "Yahoo Finance chart API",
      source_url: YAHOO_CHART_URL,
      instrument_type: yahoo.data.instrument_type || "FUTURE",
      points: trimPoints(yahoo.data.points, now),
    };
  } else {
    history.chart.points = trimPoints(history.chart.points || [], now);
  }

  const spotIsReallySpot = spotSource !== "Yahoo Finance GC=F";
  if (spot && spotIsReallySpot) {
    history.spot.points = trimPoints(
      upsertPoint(history.spot.points || [], {
        t: floorTo15(now),
        price: spot.price,
        source: spotSource,
      }),
      now
    );
  } else {
    history.spot.points = trimPoints(history.spot.points || [], now);
  }
  history.updated_utc = utcIso(now);
  history.interval_minutes = 15;
  history.retention_days = 7;

  const spotChange = changeOver24h(history.spot.points);
  const chartChange = changeOver24h(history.chart.points);
  const change = {
    spot: spotChange
      ? {
          ...spotChange,
          basis: "spot_samples",
          label: "Difference versus the stored spot sample closest to 24 hours earlier.",
        }
      : null,
    chart_series: chartChange
      ? {
          ...chartChange,
          instrument: history.chart.symbol,
          label: history.chart.label,
          basis: "comex_futures_gc_f",
        }
      : null,
  };

  const price = {
    ok: Boolean(spot),
    symbol: spotIsReallySpot ? "XAUUSD" : "GC=F",
    instrument_label: instrumentLabel,
    price: spot ? spot.price : null,
    currency: "USD",
    unit: "troy ounce",
    source: spot ? spotSource : null,
    source_url: spot ? spotUrl : null,
    fallback_used: fallbackUsed,
    provider_time_utc: spot?.provider_time_utc || null,
    fetched_utc: utcIso(now),
    display: spot ? formatUsd(spot.price) : null,
    change_24h_display: spotChange
      ? `${signed(spotChange.amount)} USD (${signed(spotChange.percent)}%) versus the spot sample 24 hours earlier`
      : chartChange
        ? `${signed(chartChange.amount)} USD (${signed(chartChange.percent)}%) in COMEX front-month futures (GC=F), not in the spot print`
        : null,
    change_24h: change,
    attempts,
    error: spot ? null : "No gold price source responded.",
  };

  return { price, history };
}
