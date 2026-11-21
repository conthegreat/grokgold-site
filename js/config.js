/*
 * Gold Radar site configuration — edit this file to go live.
 *
 * buyLinks: paste the checkout URL for each product (for example a Gumroad link).
 * While a link is empty, that button scrolls to the newsletter signup.
 * newsletterUrl: the Substack embed URL. While it is empty, the signup block
 * shows a short note and a link to the sample issue.
 * contactEmail: leave "" until you have a real inbox.
 *
 * NEVER put a secret key in this file.
 */
window.GROKGOLD_CONFIG = {
  brand: "Gold Radar",
  contactEmail: "",

  buyLinks: {
    kit: "",
    researchStack: ""
  },

  newsletterUrl: "",

  proxypi: {
    url: "https://proxypi.co.uk/",
    pricingUrl: "https://proxypi.co.uk/",
    joinUrl: "https://proxypi.co.uk/join",
    ref: "grokgold"
  }
};
