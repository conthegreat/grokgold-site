# Compliance notes — Gold Radar

**Internal note for Connor. Not legal advice. Not a customer-facing policy.**

Updated 21 November 2026 after the site moved to research and education only (main commit `cb0a20f`). The author is not a solicitor. A UK financial-services solicitor, and a data-protection reviewer, still have to sign off before anyone is charged.

## Decision already made

The product is **education and research only**. There is **no FCA authorisation**, and none is being sought for this version.

That decision removes the old signals product: no “Pro Managed”, no personal risk profile, no position sizing from the customer’s account, no execution, no Firebase, and no waitlist. It does **not** by itself prove that every page is outside section 21 of the Financial Services and Markets Act 2000, or outside the advising activity in article 53 of the Regulated Activities Order. A bull/bear brief, a daily note, or a kit prompt can still be a financial promotion, or advice, if the final wording invites a retail reader to deal in a CFD. Get a written opinion on the final desk, Telegram alerts, newsletter and kit before checkout opens.

Until that opinion is in hand, do not describe a buy, a sell, a level to trade, or a size. The line the marketing pages already use is the line to keep: no signals, no buy/sell calls, no account access, no profit promises, no broker login.

## What is actually being sold

Prices below are the ones on the site at `cb0a20f`. Confirm them at checkout. They are not a regulated quote.

| Product | Price | What it is | Who takes the money |
|---|---|---|---|
| Gold Radar Research Kit | £29 one-off | Guide, four prompts, schedules, risk-rules, journal templates. Digital download. | Gumroad, once `buyLinks.kit` is set. Confirm who the merchant of record is. |
| The Gold Radar Weekly | Free week-ahead; £6/mo or £60/yr for dailies | Sourced gold briefing on Substack. | Substack. |
| Research Stack | £34 one-off | The kit plus 10GB of ProxyPi UK residential bandwidth. | Gumroad for the bundle. The bandwidth is ProxyPi’s product. |
| Gold Radar | Free | Live dashboard at `desk/`, plus Telegram alerts (calendar heads-ups, release results, daily digest, AI bull and bear briefs). | No charge. |
| Pro channel | About £9/mo, **not on sale** | Planned paid Telegram channel of the same research. | Telegram Stars or a Stripe Payment Link. Do not open either until the price, renewal and cancel route are shown first, and the solicitor has seen the channel. |

`desk/`, `alerts/` and `data/` ship in this repo. The same “no advice, no signals, no execution” rule has to be true inside the desk and the Telegram messages.

## Consumer law, in short

- **Kit:** digital content. 14-day right under the Consumer Contracts Regulations 2013. The right is lost on immediate download only if the checkout collects prior express consent and an acknowledgement that the right will be lost. A pre-ticked box does not do that. If Gumroad cannot collect both, do not rely on the right being lost.
- **Research Stack:** the kit, plus a third-party bandwidth allowance. 14-day right on the bundle. A proportionate keep-back for bandwidth already supplied is only lawful where the customer asked for immediate supply and the deduction is fair.
- **Paid newsletter:** a service (ongoing access) and digital content (the issues). 14-day right is not lost because an email arrived. After that, cancellation stops the next renewal. Cancel path is Substack, and it has to be no harder than signup. £6/mo and £60/yr both auto-renew.
- **Pro channel, when sold:** same service-and-digital-content split as the newsletter. Stars are Telegram’s payment product, not client money. If Telegram cannot reverse Stars for a statutory refund, refund another way. Stripe, if used, must not be a bare Payment Link that hides the price, the renewal and the 14-day right.
- Consumer Rights Act 2015: reasonable care and skill, digital content of satisfactory quality, as described, and fit for a purpose the customer made known and you accepted. The liability cap in the terms needs a solicitor. It must not be read as excluding those rights, or liability for negligence causing death or personal injury, or fraud.
- Draft subscription-contract regulations were still a draft on 21 November 2026, aimed at 1 January 2027. Re-read them before that date. A stronger statutory right wins.
- State whether prices include VAT. That is an accountant’s question as well as a legal one.

## Risk warning

Legal pages use the generic wording, because no provider has supplied a figure:

> CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. Most retail investor accounts lose money when trading CFDs. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.

Do not publish a percentage sentence until `[XX]` is replaced with a figure given in writing:

> [XX]% of retail investor accounts lose money when trading CFDs with this provider.

Do not restore “70–80%” or copy Trading 212’s figure onto this site.

## Privacy

Controller: **[company name]**, **[registered address]**, **[company number]** (delete if a sole trader), **[contact email]**, **[ICO registration number]**.

Processors to contract and to record a transfer tool for, before they are used to take money or send mail:

- GitHub Pages (host logs)
- Gumroad (kit and Research Stack)
- Substack (newsletter list)
- Telegram (alerts, and the Pro channel if it opens)
- Stripe (only if a Pro Payment Link is published)

ProxyPi is a separate controller for the proxy. There is no Firebase and no waitlist.

Free newsletter email needs PECR consent. Do not export the Substack list to another sender unless the consent covers it.

## Fonts

`js/main.js` asks before it injects Google Fonts, and stores the choice in `localStorage` key `grokgold_consent` for about six months. Reject and Allow use the same button style.

The legal pages do not embed a font link, so the choice is real there. The marketing pages (`index.html`, `kit.html`, `newsletter.html`, `proxypi.html`, `sample-issue.html`, `404.html`) still preload Google Fonts. That request leaves the browser before the banner runs. Reject removes the link for the next load. It does not unsend the first request. Remove those links, or self-host Inter and JetBrains Mono (SIL Open Font Licence; check the files), if the choice should apply on every page. That edit belongs to the marketing pages, which this change does not touch.

## Names

Not affiliated with Trading 212, X, or Grok Bot. “Trading 212” is a trade mark of its owner. Re-check the proprietor on the UK IPO register and EUIPO before launch. EU records reviewed earlier in this work named Trading 212 Group Limited; there have been transfers. Do not use their logo. The kit FAQ may name one reader-operated agent tool as an example. That is not a partnership.

Proxies are for reading public pages. They are not for evading broker rules, KYC, bans, residence rules, or the law. The Research Stack copy (“fewer blocks and CAPTCHAs”) should stay on the right side of that line. A solicitor should read `proxypi.html` with the acceptable-use clause.

## Checklist

- [ ] Written perimeter opinion on the final kit, newsletter, desk and Telegram alerts.
- [ ] **[company name]**, **[company number]** or a sole-trader sentence, **[registered address]**, **[contact email]** in `js/config.js`.
- [ ] **[ICO registration number]** and the data protection fee, unless an exemption is recorded.
- [ ] VAT: inclusive or exclusive, on the checkout.
- [ ] Gumroad merchant of record, and the 14-day acknowledgement if you want immediate download to end the cancellation right.
- [ ] Substack prices set to £6/mo and £60/yr, and a tested cancel path.
- [ ] Research Stack: how the 10GB is actually delivered, and ProxyPi’s terms shown before purchase.
- [ ] Do not open the £9 Pro channel until checkout shows price, renewal and cancellation, and the Stars refund path is agreed.
- [ ] Legitimate-interests assessment for host logs. Processor contracts and transfer tools.
- [ ] Conflicts note: the newsletter already says the author may hold gold-related positions.
- [ ] Remove marketing-page Google Fonts links, or self-host.
- [ ] After sign-off, delete the dashed “Draft for a solicitor” boxes.
- [ ] Align the marketing footer’s “[Legal entity name]” with **[company name]** so the two strings are the same business.

The safe state until the checklist is done: Gumroad and Substack URLs left empty, Pro not offered, no broker connection, no loss percentage on the page.
