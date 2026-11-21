# GrokGold — sales site

Static site for **GrokGold**: a DIY AI gold research kit (£29, one-off), **The Gold Desk Weekly** (free week-ahead, or £6/mo / £60/yr), and the **Research Stack** (£34: the kit plus 10GB of ProxyPi UK residential bandwidth).

Plain HTML, CSS and vanilla JS. **No build step.** Deploys on GitHub Pages or Vercel.

> CFDs are high risk. Every page carries the risk line. The products are research and education, not investment advice, and the site is not affiliated with Trading 212, X or Grok Bot. Have the legal pages reviewed by a UK solicitor before you take payments.

## Structure

```
index.html            Home: four products (kit, newsletter, Research Stack, live desk), FAQ, signup
kit.html              AI Gold Research Desk DIY kit
newsletter.html       The Gold Desk Weekly
sample-issue.html     Issue #0, with sources
proxypi.html          Research Stack and ProxyPi plans (links out)
desk/                 Live dashboard and Telegram alerts. Built separately. Do not edit desk/, alerts/ or data/ from this site.
risk-disclosure.html  Kept as on main. Legal copy is a separate change.
terms.html            Kept as on main. Legal copy is a separate change.
privacy.html          Kept as on main. Legal copy is a separate change.
404.html              Not-found page (works on the /grokgold-site/ sub-path)
css/styles.css        Theme
js/config.js          ← EDIT THIS: buy links, Substack embed URL, contact email
js/main.js            Nav, buy buttons, newsletter embed
assets/               Favicon, Open Graph image, kit placeholder renders
vercel.json           Optional Vercel headers
robots.txt, sitemap.xml, .nojekyll
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Go live

In `js/config.js`:

1. Paste checkout URLs into `buyLinks.kit` and `buyLinks.researchStack` (Gumroad links are fine). While a link is empty, that button scrolls to the newsletter signup.
2. Paste the Substack embed URL into `newsletterUrl`. While it is empty, the signup block shows a note and a link to the sample issue.
3. Set `contactEmail` to a real inbox. While it is empty, the site shows `[contact email]`.

Do not put a secret key in this repo.

ProxyPi links are built from `proxypi` in the same file and get `utm_source=grokgold&utm_medium=referral&ref=grokgold`.

## Deploy: GitHub Pages

The workflow `.github/workflows/pages.yml` deploys the repo root on every push to `main`, and when you run it manually.

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push to `main`. The site is at **https://conthegreat.github.io/grokgold-site/**.

**Branch deploy instead:** set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`. `.nojekyll` is already in the repo.

**Custom domain:** add it under Settings → Pages, then update the canonical and Open Graph URLs, `robots.txt` and `sitemap.xml`.

## Deploy: Vercel

1. Import the repo. Framework preset: **Other**. Empty build command. Output directory `.`.
2. `vercel.json` adds security headers.
3. Update canonical and Open Graph URLs to the Vercel or custom domain.

## Placeholders

| Item | Status |
|---|---|
| Kit £29 and Research Stack £34 | The prices to charge |
| Newsletter £6/mo or £60/yr | Set the same prices in Substack |
| Checkout URLs and Substack URL | Empty until you paste them |
| Contact email and legal entity name | Placeholders in `[brackets]` |
| Kit images | Placeholder renders in `assets/`. Swap in the final files, keeping the same names |
| ProxyPi pack prices | As published by ProxyPi (10GB for £5, down to 14p/GB at 1TB; Exclusive Static £18 / 30 days; hosts £20/mo). Confirm on proxypi.co.uk |

## Compliance

- The CFD risk line is on every page, with the longer disclosure on `risk-disclosure.html`.
- Do not add performance claims, invented reviews, or copy that tells a reader what to buy or sell.
- Proxies are for a clean UK connection while agents read public pages. The site tells readers to follow the terms of every site they access.
- Not affiliated with Trading 212, X or Grok Bot.
