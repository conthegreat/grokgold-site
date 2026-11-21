# GrokGold — sales site

Static marketing site for **GrokGold AI Trader**, a multi-agent research and signals service for gold (XAU/USD) CFDs on Trading 212, bundled with **ProxyPi** UK residential proxies as the *Private Trading Stack*.

Plain HTML, CSS and vanilla JS. **No build step.** Deploys free on GitHub Pages or Vercel.

> ⚠️ CFDs are high risk. The site is written to carry a CFD risk warning on every page, avoid performance claims, and state that it is not financial advice and not affiliated with Trading 212. Get the legal pages reviewed by a UK solicitor before you take payments. Check the FCA financial promotion rules (including s21 FSMA) before you advertise.

## Structure

```
index.html            Landing page: hero, problem/solution, how it works, features,
                      illustrative dashboard, ProxyPi Private Stack, pricing,
                      testimonial placeholders, FAQ, waitlist form
risk-disclosure.html  Full risk disclosure
terms.html            Terms of service (template)
privacy.html          UK GDPR privacy notice (template)
404.html              Not-found page (works on the /grokgold-site/ sub-path)
css/styles.css        Theme (dark fintech + gold)
js/config.js          ← EDIT THIS: Stripe Payment Links, Firebase config, contact email
js/main.js            Nav, animations, pricing buttons, waitlist (Firebase or localStorage)
assets/favicon.svg    Logo mark (the favicon is also inlined in each page)
firestore.rules       Create-only Firestore rules for the waitlist
vercel.json           Optional Vercel headers / clean URLs
robots.txt, sitemap.xml, .nojekyll
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy: GitHub Pages (free)

**Option A: deploy from branch (no workflow needed, recommended)**

1. Open the repo and go to **Settings → Pages → Build and deployment**.
2. Set **Source: Deploy from a branch**, **Branch: `main`**, **Folder: `/ (root)`**, then **Save**.
3. After about a minute the site is live at **https://conthegreat.github.io/grokgold-site/**. `.nojekyll` is already in the repo, so files are served as-is.

**Option B: GitHub Actions workflow (optional)**

The bot that pushed this repo couldn't write to `.github/workflows/` because its token has no `workflow` permission. If you'd rather deploy with Actions, create `.github/workflows/pages.yml` in the GitHub web UI (Add file → Create new file) with this content, then set **Settings → Pages → Source: GitHub Actions**:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload site
        uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

**Custom domain (optional):** add it under Settings → Pages and create a `CNAME` DNS record pointing to `conthegreat.github.io`. Then update the canonical/OG URLs in the HTML, plus `robots.txt` and `sitemap.xml`.

## Deploy: Vercel (free Hobby plan)

1. Go to vercel.com → **Add New → Project** → import `conthegreat/grokgold-site`.
2. Framework preset: **Other**. Leave the build command empty and set the output directory to `.` (root).
3. Deploy. `vercel.json` adds security headers and clean URLs.
4. Update the canonical/OG URLs to your Vercel or custom domain.

## Set up the Firebase waitlist (free Spark plan)

Until this is configured, form submissions are saved only in the visitor's browser (localStorage, "demo mode").

1. Go to console.firebase.google.com → **Add project** (Analytics is optional).
2. **Build → Firestore Database → Create database** (production mode, `europe-west2` London).
3. Go to **Rules**, paste the contents of `firestore.rules` and publish. The browser can only *create* entries; it can't read them.
4. Go to **Project settings → Your apps → Web (</>)**, register the app and copy the `firebaseConfig` values into `js/config.js → firebase`.
5. Optional: **App Check** with reCAPTCHA v3 to reduce spam. Add your site domain under **Authentication → Settings → Authorised domains** if you add Auth later.
6. Read sign-ups in the Firestore console (`waitlist` collection) or export them with the Admin SDK.

The Firebase web config isn't secret. Security comes from the rules.

## Set up Stripe Payment Links

1. In the Stripe Dashboard, create 3 recurring GBP products: Starter £29/mo, Pro £99/mo, Enterprise + Proxies £249/mo.
2. For each one, go to **Payment Links → Create**. Collect the customer's email, and add a terms checkbox that links to `terms.html` and `risk-disclosure.html`.
3. Paste the `https://buy.stripe.com/...` URLs into `js/config.js → stripe.paymentLinks`.
4. Any plan with an empty link sends users to the waitlist instead.
5. Never put a secret key (`sk_...`) in this repo.

## ProxyPi referral

Every ProxyPi link is built from `js/config.js → proxypi` and gets `utm_source=grokgold&utm_medium=referral&ref=grokgold`. Change `ref` to match your affiliate/reseller tracking.

## Placeholder vs final

| Item | Status |
|---|---|
| Copy, layout, design, FAQ, risk warnings | Final draft (review wording) |
| ProxyPi pack prices / trial / Exclusive Static £18 | Taken from proxypi.co.uk (Nov 2026). Keep them in sync. |
| Plan prices £29 / £99 / £249 | **Launch pricing placeholder** |
| Plan features (API/webhooks, 3 seats, Telegram, ProxyPi allowance size) | **Placeholder**: confirm before selling |
| Stripe Payment Links | **Placeholder**: empty, falls back to waitlist |
| Firebase config | **Placeholder**: empty, falls back to localStorage |
| Contact email `hello@example.com` | **Placeholder** |
| Testimonials | **Placeholder**: clearly labelled, add only genuine, verified reviews |
| Dashboard / agent log | **Illustrative mock data** (random, labelled) |
| Terms / Privacy: company name, number, address, ICO number | **Placeholder** `[brackets]`, needs solicitor review |

## Compliance notes

- The CFD risk warning appears in a banner at the top and in the footer on every page. The risk-disclosure page has the full text. If you partner with a broker, use its published "% of retail accounts lose money" figure.
- No performance figures, win rates or real-looking testimonials. Keep it that way unless the figures are verified and presented in line with FCA rules.
- Proxies are presented only for privacy and a stable UK connection, never for evading broker rules, KYC, geo-restrictions or multi-account bans.
- Not affiliated with Trading 212.
