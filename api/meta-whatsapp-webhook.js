const sendJson = (res, status, body) => {
  res.status(status).setHeader("content-type", "application/json");
  res.send(JSON.stringify(body));
};

const queryValue = (req, name) => {
  const value = req.query?.[name];
  return Array.isArray(value) ? value[0] : value || "";
};

export default async function handler(req, res) {
  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;
  const n8nUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;

  if (req.method === "GET") {
    const mode = queryValue(req, "hub.mode");
    const token = queryValue(req, "hub.verify_token");
    const challenge = queryValue(req, "hub.challenge");

    if (mode !== "subscribe") {
      return sendJson(res, 400, { ok: false, error: "invalid_verification_request" });
    }

    if (!verifyToken || token !== verifyToken) {
      return sendJson(res, 403, { ok: false, error: "invalid_verify_token" });
    }

    res.status(200).setHeader("content-type", "text/plain");
    return res.send(String(challenge || ""));
  }

  if (req.method !== "POST") {
    res.setHeader("allow", "GET, POST");
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  if (!n8nUrl) {
    return sendJson(res, 503, { ok: false, error: "n8n_webhook_not_configured" });
  }

  const body = req.body ?? {};
  const isWhatsAppEvent =
    body?.object === "whatsapp_business_account" &&
    Array.isArray(body?.entry);

  if (!isWhatsAppEvent) {
    return sendJson(res, 400, { ok: false, error: "invalid_whatsapp_payload" });
  }

  try {
    const upstream = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-she-source": "meta-whatsapp",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return sendJson(res, 502, {
        ok: false,
        error: "n8n_rejected_event",
        upstreamStatus: upstream.status,
      });
    }

    return sendJson(res, 202, { ok: true, accepted: true });
  } catch (error) {
    console.error("Meta WhatsApp webhook relay failed", error);
    return sendJson(res, 502, { ok: false, error: "n8n_unavailable" });
  }
}
