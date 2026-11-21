const UA = "GoldRadar/1.0 (research; +https://github.com/conthegreat/grokgold-site)";

export async function getText(url, { timeoutMs = 12000, accept = "*/*" } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": UA,
        accept,
      },
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      url: res.url,
      contentType: res.headers.get("content-type") || "",
      text,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    const message = err?.name === "AbortError" ? "timeout" : String(err?.message || err);
    return { ok: false, status: 0, url, contentType: "", text: "", error: message };
  } finally {
    clearTimeout(timer);
  }
}
