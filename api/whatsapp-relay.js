const json = (response, status, body) => {
  response.status(status).setHeader("content-type", "application/json");
  response.send(JSON.stringify(body));
};

const headerValue = (request, name) => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value || "";
};

export default async function handler(request, response) {
  if (request.method === "GET") {
    return json(response, 200, { ok: true, service: "she-whatsapp-relay" });
  }

  if (request.method !== "POST") {
    response.setHeader("allow", "GET, POST");
    return json(response, 405, { ok: false, error: "method_not_allowed" });
  }

  const relaySecret = process.env.WHATSAPP_RELAY_SECRET;
  const n8nUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;

  if (!relaySecret || !n8nUrl) {
    return json(response, 503, { ok: false, error: "relay_not_configured" });
  }

  const suppliedSecret = headerValue(request, "x-she-relay-secret");
  if (suppliedSecret !== relaySecret) {
    return json(response, 401, { ok: false, error: "unauthorized" });
  }

  try {
    const upstream = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-she-relay-secret": relaySecret,
      },
      body: JSON.stringify(request.body ?? {}),
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) {
      return json(response, 502, {
        ok: false,
        error: "n8n_rejected_event",
        upstreamStatus: upstream.status,
      });
    }

    return json(response, 202, { ok: true, accepted: true });
  } catch (error) {
    console.error("WhatsApp relay failed", error);
    return json(response, 502, { ok: false, error: "n8n_unavailable" });
  }
}
