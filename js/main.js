/* GrokGold — site behaviour. Vanilla JS, no build step. */
(function () {
  "use strict";
  var CFG = window.GROKGOLD_CONFIG || {};
  var doc = document;

  /* ---------- Mobile nav ---------- */
  var toggle = doc.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = doc.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    doc.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        doc.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { doc.body.classList.remove("nav-open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- Year ---------- */
  doc.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Contact email ---------- */
  if (CFG.contactEmail) {
    doc.querySelectorAll("[data-contact-email]").forEach(function (el) {
      el.textContent = CFG.contactEmail;
      if (el.tagName === "A") el.href = "mailto:" + CFG.contactEmail;
    });
  }

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
    } catch (e) { a.href = base; }
    a.rel = "noopener";
    a.target = "_blank";
  });

  /* ---------- Reveal on scroll ---------- */
  var reveals = doc.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Hero terminal (illustrative) ---------- */
  var term = doc.getElementById("agent-terminal");
  if (term) {
    var lines = [
      ["Event Scanner", "t-info", "Economic calendar loaded — high-impact USD release flagged"],
      ["Sentiment Scanner", "t-info", "News & social tone on gold: mixed → cautious"],
      ["Gold Intelligence", "t-info", "Context built: trend, volatility regime, key levels"],
      ["Decision Agent", "t-warn", "Pre-release window — no new positions (guardrail)"],
      ["Risk Engine", "t-ok", "Exposure within limits · stop-loss rules enforced"],
      ["Decision Agent", "t-ok", "Plan published to dashboard with rationale"],
      ["Executor", "t-info", "Awaiting user-approved plan · nothing auto-placed"]
    ];
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var t0 = new Date();
    lines.forEach(function (l, i) {
      var d = new Date(t0.getTime() - (lines.length - i) * 47000);
      var hh = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
      var div = doc.createElement("div");
      div.className = "terminal-line";
      if (!reduce) div.style.animationDelay = (0.35 + i * 0.45) + "s";
      var a = doc.createElement("span"); a.className = "t-time"; a.textContent = hh + "  ";
      var b = doc.createElement("span"); b.className = "t-agent"; b.textContent = "[" + l[0] + "] ";
      var c = doc.createElement("span"); c.className = l[1]; c.textContent = l[2];
      div.appendChild(a); div.appendChild(b); div.appendChild(c);
      term.appendChild(div);
    });
  }

  /* ---------- Mock dashboard chart (illustrative, random-walk) ---------- */
  var chart = doc.getElementById("mock-chart");
  if (chart) {
    var W = 600, H = 190, N = 60, pts = [], v = 100;
    for (var i = 0; i < N; i++) { v += Math.sin(i / 5) * 0.9 + (Math.random() - 0.48) * 1.6; pts.push(v); }
    var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
    var path = pts.map(function (p, i) {
      var x = (i / (N - 1)) * W, y = H - 14 - ((p - min) / (max - min || 1)) * (H - 28);
      return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }).join(" ");
    chart.setAttribute("viewBox", "0 0 " + W + " " + H);
    chart.setAttribute("preserveAspectRatio", "none");
    chart.innerHTML =
      '<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4af37" stop-opacity=".35"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + path + " L" + W + " " + H + " L0 " + H + ' Z" fill="url(#cg)"/>' +
      '<path d="' + path + '" fill="none" stroke="#f3d27a" stroke-width="2" vector-effect="non-scaling-stroke"/>';
  }

  /* ---------- Pricing buttons: Stripe Payment Link or waitlist fallback ---------- */
  var links = (CFG.stripe && CFG.stripe.paymentLinks) || {};
  doc.querySelectorAll("[data-plan]").forEach(function (btn) {
    var plan = btn.getAttribute("data-plan");
    var url = links[plan];
    if (url && /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//.test(url)) {
      btn.href = url;
      btn.rel = "noopener";
    } else {
      btn.href = "#waitlist";
      btn.addEventListener("click", function () {
        var sel = doc.getElementById("wl-plan");
        if (sel) sel.value = plan;
      });
      var hint = btn.parentNode && btn.parentNode.querySelector(".plan-hint");
      if (hint) hint.textContent = "Checkout opens soon — join the waitlist to lock in launch pricing.";
    }
  });

  /* ---------- Waitlist form: Firebase if configured, else localStorage ---------- */
  var firebaseReady = null;
  function hasFirebase() { return !!(CFG.firebase && CFG.firebase.apiKey && CFG.firebase.projectId); }
  function getFirestore() {
    if (!firebaseReady) {
      var v = CFG.firebaseSdkVersion || "10.12.2";
      var base = "https://www.gstatic.com/firebasejs/" + v + "/";
      firebaseReady = Promise.all([import(base + "firebase-app.js"), import(base + "firebase-firestore.js")])
        .then(function (m) {
          var app = m[0].initializeApp(CFG.firebase);
          return { fs: m[1], db: m[1].getFirestore(app) };
        });
    }
    return firebaseReady;
  }
  function saveLocal(rec) {
    var key = "grokgold_waitlist";
    var list = [];
    try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { list = []; }
    list.push(rec);
    localStorage.setItem(key, JSON.stringify(list));
  }
  function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }

  doc.querySelectorAll("form[data-waitlist]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    function say(msg, cls) { if (status) { status.textContent = msg; status.className = "form-status " + (cls || ""); } }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      if (fd.get("website")) return; // honeypot
      var rec = {
        name: String(fd.get("name") || "").trim().slice(0, 120),
        email: String(fd.get("email") || "").trim().toLowerCase().slice(0, 200),
        plan: String(fd.get("plan") || "undecided").slice(0, 40),
        experience: String(fd.get("experience") || "").slice(0, 40),
        proxies: fd.get("proxies") === "on",
        message: String(fd.get("message") || "").trim().slice(0, 1000),
        consent: fd.get("consent") === "on",
        riskAck: fd.get("risk") === "on",
        source: location.pathname + location.search,
        createdAt: new Date().toISOString()
      };
      if (!rec.name) return say("Please add your name.", "err");
      if (!isEmail(rec.email)) return say("Please enter a valid email address.", "err");
      if (!rec.riskAck) return say("Please confirm you understand the CFD risk warning.", "err");
      if (!rec.consent) return say("Please agree to the privacy notice so we can contact you.", "err");
      var btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Saving…"; }
      var done = function (msg) {
        form.reset();
        say(msg, "ok");
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      };
      if (hasFirebase()) {
        getFirestore().then(function (f) {
          var data = Object.assign({}, rec, { createdAt: f.fs.serverTimestamp() });
          return f.fs.addDoc(f.fs.collection(f.db, CFG.firestoreCollection || "waitlist"), data);
        }).then(function () {
          done("You're on the list. We'll email you before launch — no spam.");
        }).catch(function (err) {
          console.warn("Firebase save failed, storing locally:", err);
          saveLocal(rec);
          done("Saved. We'll be in touch soon.");
        });
      } else {
        saveLocal(rec);
        done("You're on the list (demo mode — saved in this browser only until Firebase is configured).");
      }
    });
  });
})();
