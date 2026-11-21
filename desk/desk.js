(function () {
  const cfg = window.DESK_CONFIG || {};
  const base = cfg.DATA_BASE || "../data/";
  const LONDON = "Europe/London";

  const pageUpdated = document.getElementById("page-updated");
  const priceBody = document.getElementById("price-body");
  const priceUpdated = document.getElementById("price-updated");
  const nextBody = document.getElementById("next-body");
  const calendarUpdated = document.getElementById("calendar-updated");
  const calBody = document.getElementById("cal-body");
  const calFilters = document.getElementById("cal-filters");
  const toneBody = document.getElementById("tone-body");
  const newsBody = document.getElementById("news-body");
  const newsUpdated = document.getElementById("news-updated");
  const briefBody = document.getElementById("brief-body");
  const tgBody = document.getElementById("tg-body");
  const plansBody = document.getElementById("plans-body");

  let calendar = { events: [] };
  let impactFilter = "All";
  let countdownTimer = 0;
  let briefIndex = 0;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function money(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "unavailable";
    return new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  function signed(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "n/a";
    const body = money(Math.abs(n));
    if (n > 0) return `+${body}`;
    if (n < 0) return `−${body}`;
    return body;
  }

  function when(iso) {
    const date = new Date(iso);
    if (!iso || Number.isNaN(date.getTime())) return "time unavailable";
    const uk = new Intl.DateTimeFormat("en-GB", {
      timeZone: LONDON,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    }).format(date);
    const utc = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
    return `${uk} · ${utc} UTC`;
  }

  function httpUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function direction(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) return { cls: "flat", word: "Unchanged" };
    if (n > 0) return { cls: "up", word: "Up" };
    return { cls: "down", word: "Down" };
  }

  async function loadJson(name) {
    const response = await fetch(`${base}${name}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${name} (${response.status})`);
    return response.json();
  }

  function sparkline(points) {
    const usable = (points || []).filter((point) => Number.isFinite(Number(point.price)));
    if (usable.length < 2) return "";
    const w = 640;
    const h = 150;
    const pad = 8;
    const prices = usable.map((point) => Number(point.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const coords = usable.map((point, index) => {
      const x = pad + (index / (usable.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (Number(point.price) - min) / span) * (h - pad * 2);
      return [x, y];
    });
    const line = coords.map((pair, index) => `${index ? "L" : "M"}${pair[0].toFixed(1)},${pair[1].toFixed(1)}`).join(" ");
    const last = coords[coords.length - 1];
    const first = coords[0];
    const fill = `${line} L${last[0].toFixed(1)},${h - pad} L${first[0].toFixed(1)},${h - pad} Z`;
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Price series from ${esc(money(prices[0]))} to ${esc(money(prices[prices.length - 1]))} US dollars. Low ${esc(money(min))}, high ${esc(money(max))}." preserveAspectRatio="none">
      <title>Price series. Low ${esc(money(min))}, high ${esc(money(max))}.</title>
      <path d="${fill}" fill="rgba(212,175,55,.16)" stroke="none"></path>
      <path d="${line}" fill="none" stroke="#f3d27a" stroke-width="2"></path>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.5" fill="#f3d27a"></circle>
    </svg>`;
  }

  function renderPrice(price, history) {
    priceUpdated.textContent = price?.fetched_utc
      ? `Updated ${when(price.fetched_utc)}${price.stale ? " · last good print kept" : ""}`
      : "";
    if (!price || price.price == null) {
      priceBody.innerHTML = `<p class="error">The gold price is unavailable${price?.error ? `: ${esc(price.error)}` : "."}</p>`;
      return;
    }
    const spotChange = price.change_24h?.spot;
    const chartChange = price.change_24h?.chart_series;
    const shown = spotChange || chartChange;
    const dir = shown ? direction(shown.amount) : { cls: "flat", word: "Unavailable" };
    const spotPoints = history?.spot?.points || [];
    const chartPoints = history?.chart?.points || [];
    const useSpot = spotPoints.length >= 8;
    const series = useSpot ? spotPoints : chartPoints;
    const seriesLabel = useSpot
      ? "Sparkline: stored XAUUSD spot samples, one every 15 minutes."
      : (history?.chart?.label || "Sparkline unavailable.");
    const changeText = spotChange
      ? `${signed(spotChange.amount)} USD (${signed(spotChange.percent)}%) versus the spot sample closest to 24 hours earlier.`
      : chartChange
        ? `${signed(chartChange.amount)} USD (${signed(chartChange.percent)}%) over 24 hours in the chart series. This is not the change in the spot print.`
        : "A 24-hour comparison is not available yet.";
    const range = shown
      ? `${money(shown.from_price)} → ${money(shown.to_price)} · ${when(shown.from_utc)} to ${when(shown.to_utc)}`
      : "";
    priceBody.innerHTML = `
      <p class="symbol">${esc(price.symbol)} · ${esc(price.currency || "USD")}</p>
      <p class="price-num">${esc(money(price.price))}</p>
      <p class="price-unit">${esc(price.instrument_label || "Gold price")}</p>
      <div class="change ${dir.cls}">
        <span class="badge ${dir.cls}">${esc(dir.word)}</span>
        <b>${esc(shown ? `${signed(shown.amount)} (${signed(shown.percent)}%)` : "n/a")}</b>
        <span>${spotChange ? "Spot, 24 hours" : "COMEX futures, 24 hours — not the spot print"}</span>
      </div>
      <p class="meta">${esc(changeText)}</p>
      ${range ? `<p class="meta">${esc(range)}</p>` : ""}
      ${sparkline(series)}
      <p class="spark-cap">${esc(seriesLabel)} ${series.length ? `${series.length} points.` : ""}</p>
      <p class="meta">Source: ${price.source_url ? `<a href="${esc(httpUrl(price.source_url))}">${esc(price.source)}</a>` : esc(price.source || "unknown")} · provider time ${esc(when(price.provider_time_utc))}. Spot samples stored: ${spotPoints.length}. A spot-versus-spot comparison replaces the futures figure after 24 hours of spot samples.</p>`;
  }

  function renderNext() {
    const events = calendar.events || [];
    const now = Date.now();
    const next = events.find((event) => event.country === "USD" && event.impact === "High" && new Date(event.time_utc).getTime() > now);
    calendarUpdated.textContent = calendar.fetched_utc ? `Calendar updated ${when(calendar.fetched_utc)}` : "";
    if (!events.length) {
      nextBody.innerHTML = `<p class="error">No events in the calendar file${calendar.error ? `: ${esc(calendar.last_error || calendar.error)}` : "."}</p>`;
      return;
    }
    if (!next) {
      const last = [...events].reverse().find((event) => event.country === "USD" && event.impact === "High");
      nextBody.innerHTML = `
        <p class="event-title">Nothing upcoming in this feed</p>
        <p>The file covers ${esc(calendar.week_london_start || "—")} to ${esc(calendar.week_london_end || "—")} (UK dates). There is no high-impact USD release still ahead, so the countdown stays off.</p>
        ${last ? `<div class="facts">
          <div class="fact"><span>Latest high-impact in the feed</span><b>${esc(last.title)}</b></div>
          <div class="fact"><span>When</span><b>${esc(when(last.time_utc))}</b></div>
          <div class="fact"><span>Consensus forecast</span><b>${esc(last.forecast || "not published")}</b></div>
          <div class="fact"><span>Previous</span><b>${esc(last.previous || "not published")}</b></div>
        </div>
        <div class="why"><strong>Why gold watchers follow it. </strong>${esc(last.why_gold_watchers_follow)}</div>` : ""}
        <p class="meta">${esc(calendar.actuals_note || "")}</p>`;
      return;
    }
    nextBody.innerHTML = `
      <p class="meta"><span class="impact high">High</span> ${esc(next.country)}</p>
      <h3 class="event-title">${esc(next.title)}</h3>
      <p class="countdown" aria-hidden="true" id="countdown">—</p>
      <p class="sr-only" id="countdown-live" aria-live="polite"></p>
      <p class="meta">${esc(when(next.time_utc))}</p>
      <div class="facts">
        <div class="fact"><span>Consensus forecast</span><b>${esc(next.forecast || "not published")}</b></div>
        <div class="fact"><span>Previous</span><b>${esc(next.previous || "not published")}</b></div>
      </div>
      <div class="why"><strong>Why gold watchers follow it. </strong>${esc(next.why_gold_watchers_follow)}</div>`;
    startCountdown(next.time_utc);
  }

  function startCountdown(iso) {
    window.clearInterval(countdownTimer);
    const node = document.getElementById("countdown");
    const live = document.getElementById("countdown-live");
    if (!node) return;
    let lastSpoken = "";
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) {
        node.textContent = "Release time has passed";
        if (live) live.textContent = "The release time has passed. Refresh for an updated feed.";
        window.clearInterval(countdownTimer);
        return;
      }
      const total = Math.floor(ms / 1000);
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      const pad = (n) => String(n).padStart(2, "0");
      node.textContent = days > 0
        ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      const spoken = days > 0
        ? `${days} days, ${hours} hours and ${minutes} minutes`
        : `${hours} hours and ${minutes} minutes`;
      if (live && spoken !== lastSpoken) {
        live.textContent = `${spoken} until the release.`;
        lastSpoken = spoken;
      }
    };
    tick();
    countdownTimer = window.setInterval(tick, 1000);
  }

  function renderCalendar() {
    const events = (calendar.events || []).filter((event) => impactFilter === "All" || event.impact === impactFilter);
    if (!calFilters.childElementCount) {
      ["All", "High", "Medium"].forEach((name) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = name;
        button.setAttribute("aria-pressed", String(name === impactFilter));
        button.addEventListener("click", () => {
          impactFilter = name;
          [...calFilters.children].forEach((child) => child.setAttribute("aria-pressed", String(child.textContent === name)));
          renderCalendar();
        });
        calFilters.appendChild(button);
      });
    }
    if (!(calendar.events || []).length) {
      calBody.innerHTML = `<p>No matching events were in the latest file.</p>`;
      return;
    }
    const rows = events.map((event) => `<tr>
      <td data-label="UK date">${esc(event.london_date)}<br><span class="meta">${esc(event.london_time)} UK</span></td>
      <td data-label="Time">${esc(when(event.time_utc))}</td>
      <td data-label="Country">${esc(event.country)}</td>
      <td data-label="Event">
        <strong>${esc(event.title)}</strong>
        <details><summary>Why gold watchers follow this</summary><p>${esc(event.why_gold_watchers_follow)}</p></details>
      </td>
      <td data-label="Impact"><span class="impact ${esc(event.impact.toLowerCase())}">${esc(event.impact)}</span></td>
      <td data-label="Forecast">${esc(event.forecast || "—")}</td>
      <td data-label="Previous">${esc(event.previous || "—")}</td>
      <td data-label="Actual">${esc(event.actual || "—")}</td>
    </tr>`).join("");
    calBody.innerHTML = `
      <div class="table-wrap" tabindex="0" aria-label="Calendar, scroll sideways on a small screen">
        <table>
          <caption class="sr-only">USD high and medium impact events, and gold-titled events, with UK time, consensus forecast, previous and actual.</caption>
          <thead><tr>
            <th scope="col">UK date</th><th scope="col">Time</th><th scope="col">Country</th>
            <th scope="col">Event</th><th scope="col">Impact</th><th scope="col">Forecast</th>
            <th scope="col">Previous</th><th scope="col">Actual</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="8">Nothing in this filter.</td></tr>`}</tbody>
        </table>
      </div>
      <p class="meta">${esc(calendar.filter || "")} ${esc(calendar.actuals_note || "")}</p>`;
  }

  function renderNews(news) {
    newsUpdated.textContent = news?.fetched_utc ? `Updated ${when(news.fetched_utc)}` : "";
    const items = news?.items || [];
    const overall = news?.overall || { bullish: 0, bearish: 0, neutral: 0, label: "neutral" };
    const total = items.length || 1;
    const pct = (n) => `${Math.round((n / total) * 100)}%`;
    const feeds = (news?.feeds || []).map((feed) => {
      const cls = feed.ok ? "" : "bad";
      const detail = feed.ok ? `${feed.items} kept` : (feed.error || "failed");
      return `<li class="${cls}">${esc(feed.name)}: ${esc(detail)}</li>`;
    }).join("");
    toneBody.innerHTML = `
      <p class="gauge-label">${esc(overall.label === "bullish" ? "Bullish lean" : overall.label === "bearish" ? "Bearish lean" : "Mostly neutral")}</p>
      <div class="bar" role="img" aria-label="${overall.bullish} bullish, ${overall.bearish} bearish, ${overall.neutral} neutral headlines.">
        <i class="bull" style="width:${pct(overall.bullish)}"></i>
        <i class="bear" style="width:${pct(overall.bearish)}"></i>
        <i class="neut" style="width:${pct(overall.neutral)}"></i>
      </div>
      <ul class="legend">
        <li><span class="tone bullish">Bullish tone</span><span>${overall.bullish}</span></li>
        <li><span class="tone bearish">Bearish tone</span><span>${overall.bearish}</span></li>
        <li><span class="tone neutral">Neutral tone</span><span>${overall.neutral}</span></li>
      </ul>
      <p class="meta">${esc(news?.tone_disclaimer || "")}</p>
      <ul class="sources">${feeds}</ul>`;
    if (!items.length) {
      newsBody.innerHTML = `<p class="error">No headlines in the latest file.</p>`;
      return;
    }
    const rows = items.map((item) => {
      const href = httpUrl(item.url);
      const title = href ? `<a href="${esc(href)}">${esc(item.title)}</a>` : esc(item.title);
      return `<li>
        <span class="tone ${esc(item.tone)}">${esc(item.tone)} tone</span>
        <div>
          ${title}
          <p>${esc(item.source || item.feed_name || "")}${item.published_utc ? ` · ${esc(when(item.published_utc))}` : ""}</p>
          ${item.summary ? `<p>${esc(item.summary)}</p>` : ""}
        </div>
      </li>`;
    });
    newsBody.innerHTML = `<ul class="feed">${rows.join("")}</ul>`;
    const list = newsBody.querySelector(".feed");
    if (rows.length > 8) {
      [...list.children].forEach((item, index) => {
        if (index >= 8) item.hidden = true;
      });
      const more = document.createElement("button");
      more.type = "button";
      more.className = "btn";
      more.textContent = `Show all ${rows.length} headlines`;
      more.addEventListener("click", () => {
        [...list.children].forEach((item) => { item.hidden = false; });
        more.remove();
      });
      newsBody.appendChild(more);
    }
  }

  function inlineMarkdown(text) {
    let safe = esc(text);
    safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    return safe;
  }

  function markdown(value) {
    const lines = String(value || "").split(/\r?\n/);
    let html = "";
    let list = [];
    const flush = () => {
      if (!list.length) return;
      html += `<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`;
      list = [];
    };
    lines.forEach((line) => {
      if (/^\s*[-*]\s+/.test(line)) list.push(line.replace(/^\s*[-*]\s+/, ""));
      else if (!line.trim()) flush();
      else {
        flush();
        html += `<p>${inlineMarkdown(line)}</p>`;
      }
    });
    flush();
    return html;
  }

  function renderBrief(pack) {
    const briefs = pack?.briefs || [];
    if (!briefs.length) {
      briefBody.innerHTML = `<p>No research briefs yet. Bots commit them to <code>data/briefs/</code>.</p>`;
      return;
    }
    if (briefIndex >= briefs.length) briefIndex = 0;
    const brief = briefs[briefIndex];
    const typeLabel = { daily: "Daily", pre_event: "Pre-event", post_event: "Post-event" }[brief.type] || brief.type;
    const cases = (name, items) => `
      <div class="case">
        <h3>${name}</h3>
        <p class="meta">Arguments in the note. Not a recommendation.</p>
        ${items?.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : `<p>None listed.</p>`}
      </div>`;
    const archive = briefs.length > 1 ? `<h3>Archive</h3><ul class="archive">${briefs.map((item, index) =>
      `<li><button type="button" data-brief="${index}" aria-current="${index === briefIndex ? "true" : "false"}">${esc(item.title)}</button></li>`
    ).join("")}</ul>` : `<p class="meta">No earlier briefs.</p>`;
    briefBody.innerHTML = `
      <div class="brief-top">
        <span class="badge gold">${esc(typeLabel)}</span>
        ${brief.example ? `<span class="badge">Example</span>` : ""}
        ${brief.held ? `<span class="badge">Held</span>` : ""}
        <span class="meta">${esc(when(brief.created_utc))}</span>
      </div>
      <h3>${esc(brief.title)}</h3>
      <div class="prose">${markdown(brief.summary_markdown)}</div>
      ${brief.held ? "" : `<div class="cases">${cases("Bull case", brief.bull_case)}${cases("Bear case", brief.bear_case)}</div>`}
      ${brief.key_levels_watched_by_market_text ? `<div class="why levels"><strong>Levels mentioned in market commentary. </strong>${esc(brief.key_levels_watched_by_market_text)} These are not entry, exit, target or stop levels.</div>` : ""}
      <h3>Sources</h3>
      <ul>${(brief.sources || []).map((source) => {
        const href = httpUrl(source.url);
        return `<li>${href ? `<a href="${esc(href)}" rel="noopener noreferrer">${esc(source.title)}</a>` : esc(source.title)}</li>`;
      }).join("")}</ul>
      ${archive}`;
    briefBody.querySelectorAll("[data-brief]").forEach((button) => {
      button.addEventListener("click", () => {
        briefIndex = Number(button.getAttribute("data-brief"));
        renderBrief(pack);
      });
    });
  }

  function renderOffers() {
    const channel = httpUrl(cfg.TELEGRAM_CHANNEL_URL || "");
    const stripe = httpUrl(cfg.STRIPE_PRO_LINK || "");
    tgBody.innerHTML = channel
      ? `<p>The morning digest, and any other note the connected channel receives, is general market information.</p><a class="btn btn-gold" href="${esc(channel)}">Get alerts on Telegram</a>`
      : `<p class="coming">Telegram alerts are coming soon.</p><p class="meta">The channel link is empty in the desk config, so there is nothing to join yet.</p>`;
    plansBody.innerHTML = `
      <div class="plans">
        <article class="plan">
          <h4>Free</h4>
          <p class="amount">£0</p>
          <ul>
            <li>This dashboard</li>
            <li>The daily 07:00 UK morning digest, once a channel is connected</li>
            <li>No account and no login</li>
          </ul>
        </article>
        <article class="plan featured">
          <h4>Pro, planned</h4>
          <p class="amount">£9 <span class="meta">/ month</span></p>
          <ul>
            <li>Planned: 60-minute and 15-minute heads-ups, printed figures, and new briefs on a paid Telegram channel</li>
            <li>Telegram Stars, or a Stripe Payment Link</li>
            <li>Not on sale. No login</li>
          </ul>
          ${stripe
            ? `<a class="btn btn-gold" href="${esc(stripe)}">Open the Pro payment link</a>`
            : `<p class="coming">Waitlist: Pro is not open. There is no payment link and no form on this page, and there is no account to create.</p>`}
        </article>
      </div>
      <p class="meta">Until a second channel exists, the pipeline posts every alert type to the one chat configured in GitHub. Pro is a plan, not a separate feed yet.</p>`;
  }

  function fail(section, error) {
    section.innerHTML = `<p class="error">Could not load this section (${esc(error.message || error)}). Serve the repo root over HTTP so <code>data/</code> can be read.</p>`;
  }

  const toggle = document.querySelector(".nav-toggle");
  const topNav = document.querySelector(".nav-inner");
  toggle?.addEventListener("click", () => {
    const open = topNav.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
  });
  document.getElementById("desk-nav")?.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      topNav.classList.remove("nav-open");
      toggle?.setAttribute("aria-expanded", "false");
      if (toggle) toggle.textContent = "Menu";
    }
  });

  renderOffers();

  Promise.all([
    loadJson("price.json"),
    loadJson("price-history.json"),
    loadJson("calendar.json"),
    loadJson("news.json"),
    loadJson("briefs.json"),
  ]).then(([price, history, cal, news, briefs]) => {
    calendar = cal;
    const stamps = [price.fetched_utc, cal.fetched_utc, news.fetched_utc, briefs.updated_utc].filter(Boolean).sort();
    pageUpdated.textContent = stamps.length ? `Last updated ${when(stamps[stamps.length - 1])}` : "Updated time unavailable";
    renderPrice(price, history);
    renderNext();
    renderCalendar();
    renderNews(news);
    renderBrief(briefs);
  }).catch((error) => {
    pageUpdated.textContent = "The data files could not be loaded.";
    [priceBody, nextBody, calBody, newsBody, toneBody, briefBody].forEach((node) => fail(node, error));
  });
})();
