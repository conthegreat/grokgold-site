import { expect, test } from "@playwright/test";

const PAGES = ["", "index.html", "kit.html", "newsletter.html", "proxypi.html", "sample-issue.html", "privacy.html", "terms.html", "risk-disclosure.html", "404.html"];

function track(page) {
  const consoleErrors = [];
  const httpErrors = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    const url = msg.location().url || "";
    if (/fonts\.(googleapis|gstatic)\.com/i.test(text + url)) return;
    consoleErrors.push({ text, url });
  });
  page.on("pageerror", (err) => consoleErrors.push({ text: String(err), url: "" }));
  page.on("response", (res) => {
    if (res.status() < 400) return;
    if (res.url().startsWith(new URL(page.url() || "http://127.0.0.1").origin) || /127\.0\.0\.1|localhost/.test(res.url())) {
      httpErrors.push(res.status() + " " + res.url());
    }
  });
  return { consoleErrors, httpErrors };
}

function unexpectedConsole(errors, allowedUrls = []) {
  const allowed = new Set(allowedUrls.map((u) => u.split("#")[0]));
  return errors.filter((entry) => !allowed.has(String(entry.url || "").split("#")[0]));
}

function pageUrl(rel) {
  return rel === "" ? "./" : rel;
}

async function fillWaitlist(page, { name = "Ada Lovelace", email = "ada@example.com", proxies = false } = {}) {
  const form = page.locator("form[data-waitlist]");
  await form.scrollIntoViewIfNeeded();
  await form.locator("#wl-name").fill(name);
  await form.locator("#wl-email").fill(email);
  if (proxies && await form.locator('[name="proxies"]').count()) await form.locator('[name="proxies"]').check();
  await form.locator('[name="risk"]').check();
  await form.locator('[name="consent"]').check();
  return form;
}

test.describe("pages and assets under /grokgold-site/", () => {
  test("every page loads with no console errors and subpath assets", async ({ page, baseURL }) => {
    const { consoleErrors, httpErrors } = track(page);
    const prefix = new URL(baseURL).pathname.replace(/\/$/, "");
    for (const rel of PAGES) {
      const res = await page.goto(pageUrl(rel), { waitUntil: "networkidle" });
      expect(res.status(), rel || "/").toBeLessThan(400);
      await expect(page.locator("main#main")).toBeVisible();
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg, rel || "/").toBe("rgb(7, 9, 13)");
      const assets = await page.evaluate(() => ({
        css: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href).filter((h) => h.includes("styles.css")),
        js: [...document.scripts].map((s) => s.src).filter(Boolean),
      }));
      for (const href of [...assets.css, ...assets.js]) {
        const path = new URL(href).pathname;
        expect(path.startsWith(prefix + "/"), href).toBe(true);
        const asset = await page.request.get(href);
        expect(asset.status(), href).toBe(200);
      }
      expect(assets.css.length, rel || "/").toBeGreaterThan(0);
      expect(assets.js.some((src) => src.endsWith("/js/main.js")), rel || "/").toBe(true);
      expect(assets.js.some((src) => src.endsWith("/js/config.js")), rel || "/").toBe(true);
    }
    expect(unexpectedConsole(consoleErrors), JSON.stringify(consoleErrors, null, 2)).toEqual([]);
    expect(httpErrors, httpErrors.join("\n")).toEqual([]);
  });

  test("internal links and anchors resolve", async ({ page, baseURL }) => {
    const origin = new URL(baseURL).origin;
    const prefix = new URL(baseURL).pathname.replace(/\/$/, "");
    const checked = new Map();

    async function targetOk(abs) {
      const url = new URL(abs);
      if (url.origin !== origin) return;
      expect(url.pathname === prefix || url.pathname.startsWith(prefix + "/"), abs).toBe(true);
      const key = url.pathname;
      if (!checked.has(key)) {
        const res = await page.request.get(url.origin + url.pathname);
        checked.set(key, { status: res.status(), body: await res.text() });
      }
      const hit = checked.get(key);
      const desk = key === prefix + "/desk" || key.startsWith(prefix + "/desk/");
      if (desk && hit.status >= 400) {
        expect(hit.status, key).toBe(404);
        return;
      }
      expect(hit.status, key).toBeLessThan(400);
      if (url.hash.length > 1) {
        const id = decodeURIComponent(url.hash.slice(1));
        expect(hit.body, key + url.hash).toContain('id="' + id + '"');
      }
    }

    for (const rel of PAGES) {
      await page.goto(pageUrl(rel), { waitUntil: "load" });
      const hrefs = await page.locator("a[href]").evaluateAll((els) => els.map((a) => a.href));
      for (const href of hrefs) {
        if (!href.startsWith(origin)) continue;
        await targetOk(href);
      }
    }
    expect(checked.size).toBeGreaterThan(3);
  });

  test("domain-root hosting still resolves relative assets and the 404 base", async ({ page, baseURL }) => {
    const origin = new URL(baseURL).origin;
    const { consoleErrors, httpErrors } = track(page);
    await page.goto(origin + "/index.html", { waitUntil: "networkidle" });
    const css = await page.locator('link[rel="stylesheet"][href*="styles.css"]').getAttribute("href");
    expect(new URL(css, origin + "/index.html").pathname).toBe("/css/styles.css");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(7, 9, 13)");

    const missing = await page.goto(origin + "/missing/nested/page");
    expect(missing.status()).toBe(404);
    await expect(page.locator("main")).toContainText("404");
    expect(await page.locator("base").getAttribute("href")).toBe("/");
    const nestedCss = await page.locator('link[rel="stylesheet"][href*="styles.css"]').evaluate((el) => el.href);
    expect(new URL(nestedCss).pathname).toBe("/css/styles.css");
    const rootMissing = origin + "/missing/nested/page";
    expect(httpErrors.filter((line) => !line.includes(rootMissing))).toEqual([]);
    expect(unexpectedConsole(consoleErrors, [rootMissing])).toEqual([]);
  });
});

test.describe("404 page", () => {
  test("unknown subpath URLs render the styled 404 and keep fragment links on that URL", async ({ page, baseURL }) => {
    const { consoleErrors, httpErrors } = track(page);
    const missingPath = "/grokgold-site/missing/nested/page";
    const res = await page.goto(missingPath);
    expect(res.status()).toBe(404);
    await expect(page.locator("main")).toContainText("404");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(7, 9, 13)");
    expect(await page.locator("base").getAttribute("href")).toBe("/grokgold-site/");

    const home = await page.locator("a.brand").first().getAttribute("href");
    expect(new URL(home, baseURL).pathname).toBe("/grokgold-site/index.html");
    const navHrefs = await page.locator("#nav-links a").evaluateAll((els) => els.map((a) => a.href));
    expect(navHrefs.length).toBeGreaterThan(0);
    for (const href of navHrefs) {
      const url = new URL(href);
      expect(url.pathname.startsWith("/grokgold-site/"), href).toBe(true);
      expect(url.pathname.includes("/missing/"), href).toBe(false);
    }

    const skip = page.locator("a.skip");
    await expect(skip).toHaveAttribute("href", missingPath + "#main");
    await skip.dispatchEvent("click");
    await expect(page).toHaveURL(new RegExp(missingPath.replace(/\//g, "\\/") + "#main$"));
    await expect(page.locator("main")).toContainText("404");
    const back = page.locator('main a[href="index.html"], main a[href="./index.html"]').first();
    await back.click();
    await expect(page).toHaveURL(/\/grokgold-site\/index\.html$/);
    await expect(page.locator("main h1")).toBeVisible();

    const documentUrl = new URL(baseURL).origin + missingPath;
    const stray = httpErrors.filter((line) => !line.includes(documentUrl));
    expect(stray, stray.join("\n")).toEqual([]);
    expect(unexpectedConsole(consoleErrors, [documentUrl]), JSON.stringify(consoleErrors, null, 2)).toEqual([]);
  });
});

test.describe("newsletter and checkout fallback", () => {
  test("empty buy links go to the newsletter signup", async ({ page }) => {
    await page.goto("./");
    const links = await page.evaluate(() => (window.GROKGOLD_CONFIG && window.GROKGOLD_CONFIG.buyLinks) || null);
    test.skip(!links, "No buy links in config");
    for (const key of Object.keys(links)) {
      const button = page.locator(`[data-buy="${key}"]`).first();
      if (await button.count() === 0) continue;
      const href = await button.getAttribute("href");
      if (!links[key]) {
        expect(href, key).toMatch(/#signup$/);
      } else if (/^https:\/\//i.test(links[key])) {
        expect(href, key).toBe(links[key]);
      }
    }
    await page.goto("404.html");
    const away = page.locator('[data-buy="kit"]');
    if (await away.count() && !links.kit) {
      await expect(away.first()).toHaveAttribute("href", /newsletter\.html#signup$/);
    }
  });

  test("only https checkout URLs replace the signup fallback", async ({ page }) => {
    await page.route("**/js/config.js", async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      if (!/buyLinks\s*:/.test(body)) {
        await route.fulfill({ response: res, body });
        return;
      }
      body = body.replace(
        /buyLinks:\s*\{[^}]*\}/,
        'buyLinks: { kit: "https://gumroad.com/l/grokgold-kit", researchStack: "http://evil.example/phish" }'
      );
      await route.fulfill({ response: res, body, contentType: "text/javascript" });
    });
    await page.goto("./");
    test.skip(await page.locator("[data-buy]").count() === 0, "No buy buttons on this page");
    await expect(page.locator('[data-buy="kit"]').first()).toHaveAttribute("href", "https://gumroad.com/l/grokgold-kit");
    const stack = page.locator('[data-buy="researchStack"]');
    if (await stack.count()) await expect(stack.first()).toHaveAttribute("href", /#signup$/);
  });

  test("an empty newsletter URL keeps the sample fallback", async ({ page }) => {
    await page.goto("newsletter.html");
    const box = page.locator("[data-newsletter]");
    test.skip(await box.count() === 0, "No newsletter signup block");
    await expect(box).toContainText(/sample|not open yet/i);
    await expect(box.locator("iframe")).toHaveCount(0);
  });

  test("an https newsletter URL embeds the signup frame", async ({ page }) => {
    await page.route("**/js/config.js", async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      if (!/newsletterUrl\s*:/.test(body)) {
        await route.fulfill({ response: res, body });
        return;
      }
      body = body.replace(/newsletterUrl:\s*"[^"]*"/, 'newsletterUrl: "https://grokgold.substack.com/embed"');
      await route.fulfill({ response: res, body, contentType: "text/javascript" });
    });
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    await page.goto("newsletter.html");
    const box = page.locator("[data-newsletter]");
    test.skip(await box.count() === 0, "No newsletter signup block");
    const frame = box.locator("iframe");
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute("src", "https://grokgold.substack.com/embed");
    expect(errors).toEqual([]);
  });
});

test.describe("font consent banner", () => {
  async function readable(page) {
    return page.evaluate(() => {
      const h = document.querySelector("main h1");
      const cs = getComputedStyle(h);
      return {
        text: (h.innerText || "").trim(),
        height: h.getBoundingClientRect().height,
        color: cs.color,
        hidden: cs.visibility === "hidden" || cs.display === "none",
        font: getComputedStyle(document.body).fontFamily,
        declined: document.documentElement.classList.contains("fonts-declined"),
        google: !!document.querySelector('link[href*="fonts.googleapis.com"]'),
      };
    });
  }

  test("Allow loads Google Fonts and dismisses the banner", async ({ page }) => {
    await page.goto("privacy.html");
    const banner = page.getByRole("region", { name: "Optional Google Fonts" });
    await expect(banner).toBeVisible();
    await expect(page.locator('link[href*="fonts.googleapis.com"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Allow fonts" }).click();
    await expect(banner).toHaveCount(0);
    await expect(page.locator("#gf-css")).toHaveAttribute("href", /fonts\.googleapis\.com/);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("grokgold_consent")));
    expect(stored.fonts).toBe(true);
    await page.reload();
    await expect(page.getByRole("region", { name: "Optional Google Fonts" })).toHaveCount(0);
    await expect(page.locator("#gf-css, link[href*='fonts.googleapis.com/css']").first()).toBeAttached();
    const again = await readable(page);
    expect(again.text.length).toBeGreaterThan(0);
    expect(again.height).toBeGreaterThan(10);
  });

  test("Reject keeps system fonts and the page readable", async ({ page }) => {
    const fontRequests = [];
    page.on("request", (req) => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) fontRequests.push(req.url());
    });
    await page.goto("privacy.html");
    expect(fontRequests).toEqual([]);
    await Promise.all([
      page.waitForEvent("framenavigated"),
      page.getByRole("button", { name: "Reject" }).click(),
    ]);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("region", { name: "Optional Google Fonts" })).toHaveCount(0);
    const state = await readable(page);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("grokgold_consent")));
    expect(stored.fonts).toBe(false);
    expect(state.declined).toBe(true);
    expect(state.google).toBe(false);
    expect(state.text.length).toBeGreaterThan(0);
    expect(state.height).toBeGreaterThan(10);
    expect(state.hidden).toBe(false);
    expect(state.color).not.toBe("rgba(0, 0, 0, 0)");
    expect(state.font.toLowerCase()).toMatch(/system-ui|sans-serif/);
    await page.getByRole("button", { name: "Cookie settings" }).first().click();
    await expect(page.getByRole("region", { name: "Optional Google Fonts" })).toBeVisible();
  });

  test("pages stay readable when font hosts are blocked", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("grokgold_consent", JSON.stringify({ v: 1, fonts: false, ts: new Date().toISOString() }));
    });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    for (const rel of ["./", "kit.html", "newsletter.html", "privacy.html", "terms.html", "risk-disclosure.html"]) {
      await page.goto(rel, { waitUntil: "load" });
      const state = await readable(page);
      expect(state.text.length, rel).toBeGreaterThan(0);
      expect(state.height, rel).toBeGreaterThan(10);
      expect(state.hidden, rel).toBe(false);
      expect(state.color, rel).not.toBe("rgba(0, 0, 0, 0)");
      expect(state.declined, rel).toBe(true);
      expect(state.google, rel).toBe(false);
    }
  });
});

test.describe("mobile nav at 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("opens, follows an in-page link, and closes", async ({ page }) => {
    await page.goto("./");
    const toggle = page.locator(".nav-toggle");
    const menu = page.locator("#nav-links");
    await expect(toggle).toBeVisible();
    await expect.poll(() => menu.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => menu.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    const bg = await menu.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(7, 9, 13)");
    const named = menu.getByRole("link", { name: "How it works" });
    const how = (await named.count()) ? named.first() : menu.locator('a[href*="#"]').first();
    await expect(how).toBeVisible();
    const box = await how.boundingBox();
    expect(box.y).toBeGreaterThan(0);
    expect(box.y + box.height).toBeLessThanOrEqual(812);

    const href = await how.getAttribute("href");
    const hash = href.slice(href.indexOf("#"));
    await how.click();
    await expect(page).toHaveURL(new RegExp(hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => menu.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    const id = decodeURIComponent(hash.slice(1));
    const navBottom = await page.locator(".nav").evaluate((el) => el.getBoundingClientRect().bottom);
    const targetTop = await page.locator(`[id="${id}"]`).evaluate((el) => el.getBoundingClientRect().top);
    expect(targetTop).toBeGreaterThanOrEqual(navBottom - 1);
  });

  test("Escape closes the menu", async ({ page }) => {
    await page.goto("./");
    const toggle = page.locator(".nav-toggle");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => page.locator("#nav-links").evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  });

  test("the logo anchor is not covered by the sticky nav", async ({ page }) => {
    await page.goto("./");
    const brand = page.locator("header a.brand");
    const href = await brand.getAttribute("href");
    test.skip(!href || !href.includes("#"), "Brand link is not an in-page anchor");
    await page.evaluate(() => window.scrollTo({ top: 2400, behavior: "instant" }));
    await brand.click();
    await expect(page).toHaveURL(new RegExp(href.slice(href.indexOf("#")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
    await page.waitForFunction(() => {
      const navBottom = document.querySelector(".nav").getBoundingClientRect().bottom;
      const el = document.querySelector(".hero .eyebrow") || document.querySelector("main h1");
      if (!el) return false;
      const box = el.getBoundingClientRect();
      return box.top >= navBottom - 1 && box.bottom > navBottom;
    });
  });
});

test.describe("waitlist form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    test.skip(await page.locator("form[data-waitlist]").count() === 0, "No waitlist form on this page");
  });

  test("validates name, email, risk acknowledgement, and consent", async ({ page }) => {
    await page.goto("./");
    test.skip(await page.locator("#wl-name, [name=risk], [name=consent]").count() < 3, "Waitlist fields are not on this page");
    const form = page.locator("form[data-waitlist]");
    const status = form.locator(".form-status");
    await form.locator('button[type="submit"]').click();
    await expect(status).toHaveText("Please add your name.");

    await form.locator("#wl-name").fill("   ");
    await form.locator('button[type="submit"]').click();
    await expect(status).toHaveText("Please add your name.");

    await form.locator("#wl-name").fill("Ada");
    await form.locator("#wl-email").fill("not-an-email");
    await form.locator('button[type="submit"]').click();
    await expect(status).toHaveText("Please enter a valid email address.");

    await form.locator("#wl-email").fill("ada@example.com");
    await form.locator('button[type="submit"]').click();
    await expect(status).toHaveText("Please confirm you understand the CFD risk warning.");

    await form.locator('[name="risk"]').check();
    await form.locator('button[type="submit"]').click();
    await expect(status).toHaveText("Please agree to the privacy notice so we can contact you.");
    expect(await page.evaluate(() => localStorage.getItem("grokgold_waitlist"))).toBeNull();
  });

  test("saves to localStorage when Firebase config is empty", async ({ page }) => {
    await page.goto("./");
    test.skip(await page.locator("#wl-name").count() === 0, "Waitlist fields are not on this page");
    const firebase = await page.evaluate(() => window.GROKGOLD_CONFIG && window.GROKGOLD_CONFIG.firebase);
    test.skip(!firebase, "No Firebase config");
    expect(firebase.apiKey).toBe("");
    expect(firebase.projectId).toBe("");

    const form = await fillWaitlist(page, { proxies: true });
    if (await form.locator("#wl-plan").count()) await form.locator("#wl-plan").selectOption("enterprise");
    await form.locator('button[type="submit"]').click();
    await expect(form.locator(".form-status")).toHaveText(/demo mode — saved in this browser only/);
    await expect(form.locator("#wl-name")).toHaveValue("");

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("grokgold_waitlist")));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      consent: true,
      riskAck: true,
    });
    if (await page.locator("#wl-plan").count()) expect(saved[0].plan).toBe("enterprise");
    if (await page.locator('[name="proxies"]').count()) expect(saved[0].proxies).toBe(true);
    expect(saved[0].source).toContain("/grokgold-site/");
  });

  test("a honeypot that looks like a website field is not what blocks a real signup", async ({ page }) => {
    await page.goto("./");
    test.skip(await page.locator("#wl-name, [name=risk], [name=consent]").count() < 3, "Waitlist fields are not on this page");
    await expect(page.locator('input[name="website"]')).toHaveCount(0);
    const honeypot = page.locator('[name="grokgold_hp"]');
    test.skip(await honeypot.count() === 0, "No waitlist honeypot");
    const form = await fillWaitlist(page);
    await honeypot.evaluate((el) => { el.value = "https://autofill.example"; });
    await form.locator('button[type="submit"]').click();
    await expect(form.locator(".form-status")).toHaveText("");
    expect(await page.evaluate(() => localStorage.getItem("grokgold_waitlist"))).toBeNull();
    await expect(form.locator("#wl-name")).toHaveValue("Ada Lovelace");
  });

  test("storage failures re-enable the button instead of leaving it on Saving", async ({ page }) => {
    test.skip(await page.locator("#wl-name, [name=risk], [name=consent]").count() < 3, "Waitlist fields are not on this page");
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "grokgold_waitlist") throw new DOMException("quota", "QuotaExceededError");
        return set.call(this, key, value);
      };
    });
    await page.goto("./");
    const form = await fillWaitlist(page);
    await form.locator('button[type="submit"]').click();
    await expect(form.locator(".form-status")).toHaveText("Could not save your signup in this browser. Please try again.");
    await expect(form.locator('button[type="submit"]')).toBeEnabled();
    await expect(form.locator('button[type="submit"]')).toHaveText("Join the waitlist");
  });
});

test.describe("pricing buttons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    test.skip(await page.locator("[data-plan]").count() === 0, "No plan buttons on this page");
  });

  test("empty Stripe links fall back to the waitlist and preselect the plan", async ({ page }) => {
    await page.goto("./");
    const links = await page.evaluate(() => window.GROKGOLD_CONFIG && window.GROKGOLD_CONFIG.stripe && window.GROKGOLD_CONFIG.stripe.paymentLinks);
    test.skip(!links, "No Stripe payment links in config");
    for (const plan of ["starter", "pro", "enterprise"]) {
      const button = page.locator(`[data-plan="${plan}"]`);
      const href = await button.getAttribute("href");
      if (!links[plan]) {
        expect(href).toMatch(/#waitlist$/);
        await expect(button.locator("xpath=..").locator(".plan-hint")).toContainText("join the waitlist");
      } else {
        expect(href).toBe(links[plan]);
      }
    }
    const pro = page.locator('[data-plan="pro"]');
    test.skip(await pro.count() === 0 || await page.locator("#wl-plan").count() === 0, "No Pro plan control");
    if (links.pro) return;
    await pro.click();
    await expect(page).toHaveURL(/#waitlist$/);
    await expect(page.locator("#wl-plan")).toHaveValue("pro");
  });

  test("only real Stripe Payment Links replace the waitlist fallback", async ({ page }) => {
    const hasLinks = await page.evaluate(() => !!(window.GROKGOLD_CONFIG && window.GROKGOLD_CONFIG.stripe && window.GROKGOLD_CONFIG.stripe.paymentLinks));
    test.skip(!hasLinks, "No Stripe payment links in config");
    await page.route("**/js/config.js", async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      body = body.replace(
        /paymentLinks:\s*\{[^}]*\}/,
        'paymentLinks: { starter: "https://buy.stripe.com/test_starter", pro: "https://evil.example/phish", enterprise: "" }'
      );
      await route.fulfill({ response: res, body, contentType: "text/javascript" });
    });
    await page.goto("./");
    await expect(page.locator('[data-plan="starter"]')).toHaveAttribute("href", "https://buy.stripe.com/test_starter");
    await expect(page.locator('[data-plan="pro"]')).toHaveAttribute("href", "#waitlist");
    await expect(page.locator('[data-plan="enterprise"]')).toHaveAttribute("href", "#waitlist");
    await page.locator('[data-plan="enterprise"]').click();
    await expect(page.locator("#wl-plan")).toHaveValue("enterprise");
  });
});
