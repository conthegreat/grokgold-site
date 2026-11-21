/* Gold Radar — site behaviour. Vanilla JS, no build step. */
(function () {
  "use strict";
  var CFG = window.GROKGOLD_CONFIG || {};
  var doc = document;

  /* A <base> on the GitHub Pages 404 retargets "#id" at the site root. Pin those links to this URL. */
  if (doc.querySelector("base[href]")) {
    doc.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var hash = a.getAttribute("href");
      if (hash && hash.length > 1) a.setAttribute("href", location.pathname + location.search + hash);
    });
  }

  /* ---------- Mobile nav ---------- */
  var toggle = doc.querySelector(".nav-toggle");
  var navLinks = doc.getElementById("nav-links");
  var siteNav = doc.querySelector(".site-nav");
  var navMq = window.matchMedia("(max-width: 860px)");
  function setNav(open) {
    doc.body.classList.toggle("nav-open", open);
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (navLinks) {
      if (navMq.matches && !open) navLinks.setAttribute("inert", "");
      else navLinks.removeAttribute("inert");
    }
  }
  if (toggle) {
    setNav(false);
    toggle.addEventListener("click", function (e) {
      var next = !doc.body.classList.contains("nav-open");
      setNav(next);
      if (next && e.detail === 0 && navLinks) {
        var first = navLinks.querySelector("a");
        if (first) first.focus();
      }
    });
    doc.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { setNav(false); });
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && doc.body.classList.contains("nav-open")) {
        setNav(false);
        toggle.focus();
      }
    });
    if (siteNav) {
      siteNav.addEventListener("focusout", function (e) {
        if (!navMq.matches || !doc.body.classList.contains("nav-open")) return;
        if (!e.relatedTarget || !siteNav.contains(e.relatedTarget)) setNav(false);
      });
    }
    if (navMq.addEventListener) {
      navMq.addEventListener("change", function () { if (!navMq.matches) setNav(false); });
    }
  }

  /* ---------- Year ---------- */
  doc.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Contact email ---------- */
  doc.querySelectorAll("[data-contact-email]").forEach(function (el) {
    var email = (CFG.contactEmail || "").trim();
    if (email) {
      el.textContent = email;
      if (el.tagName === "A") el.href = "mailto:" + email;
      else {
        var a = doc.createElement("a");
        a.href = "mailto:" + email;
        a.textContent = email;
        a.setAttribute("data-contact-email", "");
        el.replaceWith(a);
      }
    } else {
      el.textContent = "[contact email]";
      if (el.tagName === "A") el.removeAttribute("href");
    }
  });

  /* ---------- ProxyPi links with referral tag ---------- */
  doc.querySelectorAll("[data-proxypi]").forEach(function (a) {
    var key = a.getAttribute("data-proxypi") || "url";
    var base = (CFG.proxypi && CFG.proxypi[key]) || "https://proxypi.co.uk/";
    try {
      var u = new URL(base);
      if (CFG.proxypi && CFG.proxypi.ref) {
        u.searchParams.set("utm_source", "grokgold");
        u.searchParams.set("utm_medium", "referral");
        u.searchParams.set("ref", CFG.proxypi.ref);
      }
      a.href = u.toString();
    } catch (e) {
      a.href = base;
    }
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    if (!a.querySelector(".ext-hint")) {
      var hint = doc.createElement("span");
      hint.className = "sr-only ext-hint";
      hint.textContent = " (opens in a new tab)";
      a.appendChild(hint);
    }
  });

  /* ---------- Buy buttons: checkout URL, or the newsletter signup ---------- */
  var links = CFG.buyLinks || {};
  doc.querySelectorAll("[data-buy]").forEach(function (btn) {
    var key = btn.getAttribute("data-buy");
    var url = links[key] || "";
    if (url && /^https:\/\//i.test(url)) {
      btn.href = url;
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      if (!btn.querySelector(".ext-hint")) {
        var hint = doc.createElement("span");
        hint.className = "sr-only ext-hint";
        hint.textContent = " (opens in a new tab)";
        btn.appendChild(hint);
      }
    } else if (doc.getElementById("signup")) {
      btn.href = "#signup";
    } else {
      btn.href = "newsletter.html#signup";
    }
  });

  /* ---------- Newsletter embed ---------- */
  doc.querySelectorAll("[data-newsletter]").forEach(function (box) {
    var url = (CFG.newsletterUrl || "").trim();
    if (!url || !/^https:\/\//i.test(url)) return;
    box.textContent = "";
    var frame = doc.createElement("iframe");
    frame.src = url;
    frame.title = "Subscribe to The Gold Radar Weekly";
    frame.loading = "lazy";
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    box.appendChild(frame);
  });

  /* ---------- Reveal on scroll ---------- */
  var reveals = doc.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Optional Google Fonts ----------
     Pages that omit the font tags contact Google only after Allow.
     If a page already embeds a font link, Reject removes it for later
     loads; it cannot undo a request the browser already sent.
     Do not add analytics or other third-party scripts here.
  */
  var CONSENT_KEY = "grokgold_consent";
  var CONSENT_MAX_AGE = 183 * 24 * 60 * 60 * 1000;
  var FONT_CSS = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap";

  function readConsent() {
    try {
      var c = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
      if (!c || c.v !== 1 || !c.ts) return null;
      if (isNaN(Date.parse(c.ts)) || Date.now() - Date.parse(c.ts) > CONSENT_MAX_AGE) return null;
      return c;
    } catch (e) { return null; }
  }
  function writeConsent(allowFonts) {
    var c = { v: 1, fonts: !!allowFonts, ts: new Date().toISOString() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); } catch (e) { /* storage blocked */ }
    return c;
  }
  function stripEmbeddedFonts() {
    doc.documentElement.classList.add("fonts-declined");
    doc.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]').forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }
  function loadFonts() {
    doc.documentElement.classList.remove("fonts-declined");
    if (doc.getElementById("gf-css") || doc.querySelector('link[href*="fonts.googleapis.com/css"]')) return;
    var pre1 = doc.createElement("link");
    pre1.rel = "preconnect";
    pre1.href = "https://fonts.googleapis.com";
    var pre2 = doc.createElement("link");
    pre2.rel = "preconnect";
    pre2.href = "https://fonts.gstatic.com";
    pre2.crossOrigin = "anonymous";
    var css = doc.createElement("link");
    css.id = "gf-css";
    css.rel = "stylesheet";
    css.href = FONT_CSS;
    doc.head.appendChild(pre1);
    doc.head.appendChild(pre2);
    doc.head.appendChild(css);
  }
  function dismissBanner() {
    var el = doc.getElementById("cookie-banner");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    doc.body.classList.remove("cookie-open");
  }
  function showBanner() {
    if (doc.getElementById("cookie-banner")) {
      doc.body.classList.add("cookie-open");
      var again = doc.querySelector("[data-cookie-reject]");
      if (again) again.focus();
      return;
    }
    var bar = doc.createElement("div");
    bar.id = "cookie-banner";
    bar.className = "cookie-banner";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-labelledby", "cookie-banner-title");
    var inner = doc.createElement("div");
    inner.className = "container";
    var copy = doc.createElement("div");
    var h = doc.createElement("h2");
    h.id = "cookie-banner-title";
    h.textContent = "Optional Google Fonts";
    var p = doc.createElement("p");
    p.appendChild(doc.createTextNode("Your device\u2019s fonts are used unless you allow Google Fonts, which sends your IP address to Google. A page that already includes a font link may have contacted Google before this choice. We do not use advertising or analytics cookies. "));
    var link = doc.createElement("a");
    link.href = "privacy.html#cookies";
    link.textContent = "Privacy notice";
    p.appendChild(link);
    p.appendChild(doc.createTextNode("."));
    copy.appendChild(h);
    copy.appendChild(p);
    var actions = doc.createElement("div");
    actions.className = "cookie-actions";
    var reject = doc.createElement("button");
    reject.type = "button";
    reject.className = "btn btn-ghost btn-sm";
    reject.setAttribute("data-cookie-reject", "");
    reject.textContent = "Reject";
    var allow = doc.createElement("button");
    allow.type = "button";
    allow.className = "btn btn-ghost btn-sm";
    allow.textContent = "Allow fonts";
    actions.appendChild(reject);
    actions.appendChild(allow);
    inner.appendChild(copy);
    inner.appendChild(actions);
    bar.appendChild(inner);
    var skip = doc.querySelector("a.skip");
    if (skip && skip.nextSibling) doc.body.insertBefore(bar, skip.nextSibling);
    else doc.body.insertBefore(bar, doc.body.firstChild);
    doc.body.classList.add("cookie-open");
    function choose(allowFonts) {
      writeConsent(allowFonts);
      if (allowFonts) loadFonts();
      else stripEmbeddedFonts();
      dismissBanner();
      if (!allowFonts) location.reload();
    }
    reject.addEventListener("click", function () { choose(false); });
    allow.addEventListener("click", function () { choose(true); });
  }
  var storedConsent = readConsent();
  if (storedConsent && storedConsent.fonts) loadFonts();
  else if (storedConsent) stripEmbeddedFonts();
  else showBanner();
  doc.querySelectorAll("[data-cookie-settings]").forEach(function (btn) {
    btn.addEventListener("click", function () { showBanner(); });
  });
})();
