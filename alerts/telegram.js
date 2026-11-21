/**
 * Deliver GrokGold Desk alerts to a Telegram channel.
 * Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID means dry-run: log only.
 * Dry-runs are not recorded as sent.
 */

const ENDPOINT = "https://api.telegram.org";

export function credentialsFromEnv(env = process.env) {
  const token = (env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = (env.TELEGRAM_CHAT_ID || "").trim();
  return {
    token,
    chatId,
    dryRun: !token || !chatId,
  };
}

export async function sendTelegram(text, { token, chatId, fetchImpl = fetch } = {}) {
  if (!token || !chatId) {
    return { ok: true, dryRun: true, description: "dry-run" };
  }
  let response;
  try {
    response = await fetchImpl(`${ENDPOINT}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    return { ok: false, dryRun: false, description: String(err?.message || err) };
  }
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (!response.ok || body.ok === false) {
    return {
      ok: false,
      dryRun: false,
      status: response.status,
      description: body.description || `HTTP ${response.status}`,
    };
  }
  return {
    ok: true,
    dryRun: false,
    message_id: body.result?.message_id || null,
  };
}

export async function deliverAlerts(alerts, creds, fetchImpl = fetch) {
  const results = [];
  for (const alert of alerts) {
    if (creds.dryRun) {
      console.log(`\n----- DRY RUN ${alert.key} -----\n${alert.text}\n----- END ${alert.key} -----\n`);
      results.push({ key: alert.key, ok: true, dryRun: true });
      continue;
    }
    const sent = await sendTelegram(alert.text, { ...creds, fetchImpl });
    if (sent.ok) {
      console.log(`Sent ${alert.key} (message ${sent.message_id})`);
    } else {
      console.error(`Telegram rejected ${alert.key}: ${sent.description}`);
    }
    results.push({ key: alert.key, ...sent });
  }
  return results;
}
