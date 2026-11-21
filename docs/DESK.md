# Gold Radar

A research page for gold (XAUUSD) and a Telegram alert pipeline. It runs on free GitHub Actions, free data feeds and GitHub Pages. There is no server to host and no login.

The page is `desk/index.html`. On GitHub Pages it is served at:

https://conthegreat.github.io/grokgold-site/desk/

**General market information, not investment advice. CFDs are high risk.**

Gold Radar is not FCA-authorised. The desk must not be used to send buy or sell calls, entries, exits, targets, stops, position sizes or performance claims.

## What you need to provide

Two GitHub Actions secrets, and nothing else, before alerts can leave the repo:

| Secret | What it is |
|---|---|
| `TELEGRAM_BOT_TOKEN` | The token BotFather gives you. It looks like `123456:ABC...`. |
| `TELEGRAM_CHAT_ID` | The channel the bot posts into. A public channel can use `@yourchannel`. A private channel uses a numeric id such as `-1001234567890`. |

Until both are set, the workflow still updates the data files and logs each alert it would have sent. It does not mark those alerts as sent, so the first real run after you add the secrets still sends whatever is due at that moment.

Optional, later, in `desk/config.js` (this file is public — never put the bot token here):

| Value | Effect when filled |
|---|---|
| `TELEGRAM_CHANNEL_URL` | Public channel https://t.me/goldradaruk. Turns the “coming soon” note into a **Join on Telegram** link that opens in a new tab. |
| `STRIPE_PRO_LINK` | Turns the Pro waitlist note into a button. Use a Stripe Payment Link (`https://buy.stripe.com/...`), never a secret key. |

## Compliance rules for anything you publish

Every page and every Telegram message already ends with or carries this sentence. Keep it intact if you edit copy:

> General market information, not investment advice. CFDs are high risk.

Rules for new copy, including briefs your bots commit:

- Describe what was published (a price, a calendar figure, a headline, an argument). Do not tell a reader to buy, sell, go long or go short.
- Do not give an entry, an exit, a target, a stop or a position size.
- Do not claim a win rate, a return, or that the desk “made” or “lost” money. A price difference versus an earlier print is allowed when the series is named.
- “Bull case” and “bear case” mean arguments in a note, shown side by side. They are not a recommendation.
- Headline tone is a keyword count. Label it as headline tone, not a forecast.
- Consensus forecast, previous and actual on the calendar are the data vendor’s figures, not Gold Radar estimates.
- If a brief contains a trade instruction (`buy gold`, `sell gold`, `go long`, `go short`, `entry at`, `stop-loss`, `take-profit`, `position size`, `price target`), the pipeline holds it back. The dashboard shows a short explanation instead of the text, and Telegram does not send it.
- Do not remove the risk line to make a message shorter.

## How it is built

```
alerts/run.js                         Pipeline. Node 20, no npm dependencies.
alerts/telegram.js                    Sends, or dry-runs when secrets are missing.
alerts/samples.js                     Prints one sample of each alert. Does not send.
alerts/self-check.js                  Local checks for time, tone, windows and wording.
.github/workflows/desk-data.yml       Cron every 15 minutes, plus workflow_dispatch.
data/price.json                       Latest spot print.
data/price-history.json               15-minute points kept for 7 days.
data/calendar.json                    Filtered calendar, UTC and Europe/London.
data/news.json                        Headlines, tone, and which feeds failed.
data/briefs/YYYY-MM-DD-HHMM.json      One file per brief, written by your bots.
data/briefs.json                      Index rebuilt each run so the static page can read it.
data/alert-state.json                 Keys of alerts Telegram has accepted.
desk/                                 The page, its CSS, its JS, and desk/config.js.
```

The workflow checks out the repo, runs `node alerts/run.js`, and that script commits `data/` back with `GITHUB_TOKEN` only when a data file changed. It does not run on every push, so a data commit does not start another data run. A push to `main` does refresh GitHub Pages, which is what puts the new JSON on the site.

Scheduled workflows run from the default branch only, after this file is on `main`. GitHub often starts a `*/15` cron late. The morning digest therefore stays open from 07:00 to 08:29 UK time and is sent once.

If `main` is protected and the Actions bot cannot push, the data job will fail at the push. Allow `github-actions[bot]` to push to `main`, or use a ruleset bypass for that app. Do not switch the job to a personal access token unless you are comfortable storing one.

## Run it on your machine

From the repo root, with Node 20 or newer:

```bash
node alerts/self-check.js
node alerts/run.js
node alerts/samples.js
python3 -m http.server 8000
```

Open http://localhost:8000/desk/ . Opening the HTML file directly will not load the JSON.

`node alerts/run.js` writes `data/` and does not commit. A commit happens only when `GITHUB_ACTIONS=true`.

## Data sources

Checked from this environment on 21 November 2026. The pipeline records the same result on each run inside the JSON files (`attempts` on the price, `feeds` on the news).

| Source | Role | Result |
|---|---|---|
| `https://api.gold-api.com/price/XAU` | Spot price, keyless | Worked. USD per troy ounce. |
| `https://data-asg.goldprice.org/dbXRates/USD` | Spot fallback | HTTP 403 when probed. Tried only if gold-api.com fails. |
| `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=15m&range=7d` | 15-minute history, and last-resort price | Worked. This is COMEX gold futures (front month), not the spot. The page says so. If the spot call fails, the big number is labelled as futures rather than passed off as spot. |
| `https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X` | Spot history candidate | HTTP 404. Not used. |
| `api.metals.live` | Spot candidate | TLS error. Not called by the pipeline. |
| `https://nfs.faireconomy.media/ff_calendar_thisweek.json` | Economic calendar | Worked. Kept USD high and medium impact, plus any title mentioning gold, XAU, bullion or precious metals. Times are stored in UTC and as Europe/London. |
| Same feed, `actual` field | Post-release alerts | The JSON feed did not include `actual` on 21 November 2026. The alert code sends a post-release note only when a non-empty actual appears and the event is less than 36 hours old. |
| Google News gold RSS | Headlines | Worked. |
| `https://www.investing.com/rss/news_11.rss` | Investing.com commodities RSS | Worked. Rows that are not about gold are dropped. |
| Kitco (`https://news.kitco.com/feed` and the usual `/rss` paths) | Headlines | HTTP 200 HTML, not a feed. Kitco stories still arrive via Google News. |
| `https://www.fxstreet.com/rss/gold` | Headlines | HTTP 403. |
| `https://feeds.reuters.com/reuters/businessNews` | Headlines | DNS failure (`fetch failed`). |

Headline tone counts distinct bullish and bearish words in the title. “Gold surges as the dollar slides” is a bullish tone. “Gold price today” is neutral. The gauge is the share of those labels. It is not a forecast.

The 24-hour figure on the price card uses stored spot samples once they cover about 24 hours. Until then it shows the 24-hour difference in the COMEX series and says it is not the spot move. Futures do not print a bar every 15 minutes while the pit is closed, so the chart has gaps. That is the feed, not a missing job.

## Alerts

All messages use Telegram `parse_mode=HTML`. Text from the feeds is escaped. Each message carries the risk line.

| Alert | When it is due | What it says |
|---|---|---|
| 60-minute heads-up | A high-impact USD event is 31 to 80 minutes away, once | Event, UK and UTC time, minutes left, consensus forecast, previous, and why gold desks watch that kind of release. |
| 15-minute heads-up | The same event is 1 to 30 minutes away, once | Same facts, with the shorter countdown. |
| Figure printed | The feed’s actual goes from empty to non-empty, event is within the last 36 hours, once | Actual, forecast, previous, and whether the actual is above, below or level with the forecast. That comparison is described as a comparison of the two figures, not a view on gold. |
| Morning digest | 07:00–08:29 Europe/London, once per UK date | Spot price, the 24-hour figure with its series named, today’s events, top 5 headlines with tone. |
| New brief | A brief id appears that is not an example and was not held back | Title, summary, bull case, bear case, sources. |

`data/alert-state.json` stores `{ "sent": { "<key>": { "at", "message_id" } } }`. Keys look like `pre60:USD|Core Retail Sales m/m|2026-11-17T13:30:00Z`. A failed send is not stored, so the next run retries while the alert is still inside its window. A dry-run is not stored either.

Medium-impact events are on the dashboard and in the digest. They do not get the 60- and 15-minute heads-ups.

Example briefs (`"example": true`) are shown on the page and are not sent.

There is one chat id. Free on the page means the dashboard plus the morning digest. Pro (£9/month, not on sale) is the planned paid channel for the intraday notes, via Telegram Stars or the Stripe link. The sender does not split free and Pro until you point it at a second chat. Do not tell people the intraday notes are already exclusive to payers.

## Create the bot, the channel and the chat id

1. In Telegram, open [@BotFather](https://t.me/BotFather).
2. Send `/newbot`. Follow the prompts (a display name, then a username ending in `bot`).
3. Copy the HTTP API token. This is `TELEGRAM_BOT_TOKEN`. Do not commit it and do not paste it into `desk/config.js`.
4. Create a channel: menu, **New Channel**. A public channel gives you an `@name`. A private channel is fine too.
5. Open the channel, **Administrators**, **Add administrator**, choose the bot. Allow it to post messages. It does not need to add members or edit the channel info.
6. Chat id:
   - Public channel: use `@yourchannel` (including the `@`) as `TELEGRAM_CHAT_ID`.
   - Private channel: put the bot in the channel, post any message, then in a browser open `https://api.telegram.org/bot<token>/getUpdates`. Find `"chat":{"id":-100...}` inside a `channel_post`. That negative id is `TELEGRAM_CHAT_ID`. If `getUpdates` is empty, send another channel message and reload. You can also forward a channel post to a bot such as `@userinfobot` or `@RawDataBot` and read the forwarded chat id.
7. In the GitHub repo go to **Settings → Secrets and variables → Actions → New repository secret**. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
8. **Actions → Desk data and alerts**. If GitHub says workflows are disabled, enable them. Run the workflow with **Run workflow** once and read the log. A successful send prints `Sent <key>`. A missing secret prints `Dry-run`.
9. The 15-minute schedule starts on its own once the workflow file is on the default branch. You do not need a separate switch beyond enabling Actions.

The public channel is https://t.me/goldradaruk. `TELEGRAM_CHANNEL_URL` in `desk/config.js` is that URL. The dashboard button opens it in a new tab.

## Telegram paid subscriptions

Pro is not wired up. When you want a paid channel, Telegram’s own control is a paid invite link, not something this repo collects cards for.

Telegram’s announcement (14 August 2024) describes the path as: **Channel settings → Channel type → Manage invite links → Create a new link → Require monthly fee**. The fee is in Telegram Stars. The subscription period Telegram documents is 30 days, and a subscription link is for a private channel. Price limits and which countries can buy Stars change; check the current Telegram client and [Telegram’s Stars documentation](https://core.telegram.org/api/stars) before you tell anyone a price in Stars.

Practical shape that matches the page:

1. Keep a free channel for the morning digest. Its link is `TELEGRAM_CHANNEL_URL`.
2. Create a second, private channel for Pro. Add the same bot as an admin who can post.
3. Create a paid invite link at the Star price you choose. £9 is the planned cash price on the page; Stars are not pounds, so pick a Star amount you are willing to state in your own words. This guide does not convert Stars to GBP.
4. Put that `https://t.me/...` invite link in the Pro card only after you are actually charging. Until then leave the page on the waitlist note.
5. This pipeline still has one `TELEGRAM_CHAT_ID`. Point it at the channel that should receive the automated posts. Splitting “digest to the free channel, intraday notes to the paid channel” means a second chat id and a small change in `alerts/run.js`. Do that only when the paid channel exists, and keep the same wording rules.

Telegram, not this repo, charges the subscriber and renews the 30-day period. Read Telegram’s current terms before you take payment. Stars are not a substitute for FCA authorisation.

## Stripe Payment Link

1. In the Stripe Dashboard create a £9/month GBP price only if you are ready to sell. While you are not, leave `STRIPE_PRO_LINK` empty.
2. Create a Payment Link. Collect email if you need it for receipts. Add a terms checkbox that points at `terms.html` and `risk-disclosure.html`.
3. Paste the `https://buy.stripe.com/...` URL into `STRIPE_PRO_LINK`.
4. Never put `sk_...` or `rk_...` in the repo. The publishable Payment Link URL is safe to commit.

The page has no account system. A Payment Link does not log anyone into the desk.

## How a research bot commits a brief

Add one JSON file per note:

```
data/briefs/YYYY-MM-DD-HHMM.json
```

`HHMM` is UTC, 24-hour, zero-padded, for example `data/briefs/2026-11-22-0700.json`. The pipeline does not care about the filename beyond it ending in `.json`. It reads every JSON file in that directory. The id inside the file is what deduplicates alerts.

Schema:

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable string. A new id is a new alert. Reusing an id does not send twice. |
| `created_utc` | yes | ISO-8601 time, for example `2026-11-22T07:00:00Z`. |
| `type` | yes | `daily`, `pre_event` or `post_event`. |
| `title` | yes | Short heading. |
| `summary_markdown` | yes | Paragraphs, `-` lists, `**bold**`, `*italic*`, and `[label](https://...)` links. No HTML. |
| `bull_case` | yes | Array of strings. Arguments, not instructions. |
| `bear_case` | yes | Array of strings. |
| `key_levels_watched_by_market_text` | no | Plain text about levels commentators mention. The page states these are not entry, exit, target or stop levels. Omit the field if you have nothing to say. |
| `sources` | yes | Array of `{ "title", "url" }` with `http` or `https` URLs. |
| `example` | no | `true` shows the note and does not send it. Use this for fixtures. |

Example already in the repo: `data/briefs/2026-11-21-0700.json`.

A bot can commit straight to `main` or open a pull request. The next desk run rebuilds `data/briefs.json` (the file the page fetches; GitHub Pages will not list the directory) and sends the brief if it is new, not an example, and not held for trade-instruction language.

Validate before you commit:

```bash
node alerts/self-check.js
```

The checker includes a schema example. After the file is on disk, `node alerts/run.js` rewrites `data/briefs.json`, and `node alerts/samples.js` prints the Telegram HTML without sending it.

## What the page shows

- Spot price, source, provider time, and a 24-hour difference with the series named.
- An inline SVG sparkline. No chart library.
- The next high-impact USD release with a live countdown, or a clear “nothing upcoming” state when the feed’s week is already over.
- The week’s table with UK time, UTC, impact, forecast, previous and actual. Each row can be opened for the “why gold watchers follow this” line.
- Headlines with tone chips and a tone gauge.
- The latest brief, bull case and bear case side by side, and an archive when there is more than one.
- “Join on Telegram”, linking to https://t.me/goldradaruk. An empty `TELEGRAM_CHANNEL_URL` still says coming soon.
- Free (£0, dashboard and the morning digest) and Pro (planned, £9/month). Empty `STRIPE_PRO_LINK` shows the waitlist note. No login.

“Last updated” uses the file timestamps, shown in UK time and UTC.

## If a run looks wrong

- Actions log, step “Fetch data and send due alerts”. Source failures are printed and also stored in `data/price.json` and `data/news.json`. A failed source does not wipe the previous good file.
- Telegram replies with `chat not found` when the bot is not an admin of that channel, or the id is wrong.
- `401` from Telegram means the token is wrong.
- No morning message: the run did not land between 07:00 and 08:29 UK, or that UK date is already in `alert-state.json`.
- No post-release message: the calendar JSON still has no `actual`. Do not invent one in `calendar.json`.
- Pages shows old JSON: the data workflow must be on `main` and able to push. Pages deploys from `main` via `.github/workflows/pages.yml`.
