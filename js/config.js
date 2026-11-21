/*
 * GrokGold site configuration — the ONLY file you need to edit to go live.
 *
 * 1. Stripe: create Payment Links in the Stripe Dashboard (Products -> Payment Links)
 *    and paste each https://buy.stripe.com/... URL below. While a link is empty,
 *    the matching "Choose plan" button scrolls to the waitlist form instead.
 * 2. Firebase: create a free (Spark) project, add a Web App, enable Firestore,
 *    deploy firestore.rules, then paste the web config below. While apiKey is
 *    empty, waitlist sign-ups are stored only in the visitor's browser
 *    (localStorage) so the form still works for demos.
 *
 * Firebase web config values are not secrets — access is controlled by firestore.rules.
 * NEVER put a Stripe secret key (sk_...) in this file.
 */
window.GROKGOLD_CONFIG = {
  brand: "GrokGold",
  contactEmail: "hello@example.com", // PLACEHOLDER — replace with a real inbox

  stripe: {
    // PLACEHOLDER Payment Links — leave "" to fall back to the waitlist.
    paymentLinks: {
      starter: "",    // £29 / month  — Starter Signals
      pro: "",        // £99 / month  — Pro Managed
      enterprise: ""  // £249 / month — Enterprise + Proxies
    }
  },

  firebase: {
    // PLACEHOLDER — paste your Firebase web app config here.
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  firestoreCollection: "waitlist",
  firebaseSdkVersion: "10.12.2",

  proxypi: {
    // Optional: add your referral / affiliate parameter for tracking.
    url: "https://proxypi.co.uk/",
    trialUrl: "https://proxypi.co.uk/signup/trial",
    pricingUrl: "https://proxypi.co.uk/pricing",
    ref: "grokgold"
  }
};
