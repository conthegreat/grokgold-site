/* GrokGold — site behaviour. Vanilla JS, no build step. */
(function () {
  "use strict";
  var CFG = window.GROKGOLD_CONFIG || {};
  var doc = document;

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
    frame.title = "Subscribe to The Gold Desk Weekly";
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
})();
