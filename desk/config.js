/*
 * Gold Radar — public configuration. Never put a bot token, chat id,
 * or any other secret in this file. Tokens live in GitHub Actions secrets.
 *
 * TELEGRAM_CHANNEL_URL  Public https://t.me/... link for "Join on Telegram".
 *                       The live channel is https://t.me/goldradaruk.
 *                       Leave "" only if the channel is closed. The page then says
 *                       alerts are coming soon.
 * STRIPE_PRO_LINK       https://buy.stripe.com/... for the planned £9/month Pro
 *                       Payment Link. Leave "" until it exists. The page then
 *                       shows a waitlist note. There is no login either way.
 * DATA_BASE             Where the static page reads JSON. Default works on
 *                       GitHub Pages at /grokgold-site/desk/ and on a local
 *                       server started at the repo root.
 */
window.DESK_CONFIG = {
  TELEGRAM_CHANNEL_URL: "https://t.me/goldradaruk",
  STRIPE_PRO_LINK: "",
  DATA_BASE: "../data/",
};
