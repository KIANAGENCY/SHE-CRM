import { seed, stages, orderStages, sampleStages } from "./data.js";
import {
  uid,
  audit,
  money,
  totals,
  requestSample,
  directRoute,
  createOrder,
  advanceOrder,
  advanceSample,
  book,
  dormantClients,
  responseFor,
} from "./domain.js";
import {
  cloudEnabled,
  deleteCloudRecord,
  getCloudContext,
  loadCloudState,
  onAuthStateChange,
  pushCloudState,
  signIn,
  signOut,
  signUp,
  updateProductionOrder,
} from "./cloud.js";
const KEY = "hotel-expert-crm-v1";
let state;
let cloudContext = null;
let cloudQueue = Promise.resolve();
let authMode = "signin";
let storageWarning = "";
try {
  const stored = JSON.parse(localStorage.getItem(KEY));
  state = stored?.version === 1 ? stored : seed();
} catch {
  state = seed();
  storageWarning =
    "No se pudieron recuperar los datos guardados. Se abrió la demostración inicial.";
}
let query = "",
  routeFilter = "all",
  selectedClient = "c1",
  period = 30;
const app = document.querySelector("#app"),
  dialog = document.querySelector("#dialog");
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const client = (id) => state.clients.find((c) => c.id === id);
const cname = (id) => client(id)?.name || "Cliente";
const btn = (label, action, id = "", primary = false) =>
  `<button ${primary ? 'class="primary"' : ""} data-action="${action}" data-id="${esc(id)}">${esc(label)}</button>`;
const go = (label, route, primary = false) =>
  `<button ${primary ? 'class="primary"' : ""} data-go="${route}">${esc(label)}</button>`;
const badge = (label, tone = "") =>
  `<span class="badge ${tone}">${esc(label)}</span>`;
const field = (label, name, value = "", type = "text", extra = "") =>
  `<label>${esc(label)}<input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`;
const select = (label, name, values, value = "") =>
  `<label>${esc(label)}<select name="${name}">${values
    .map((v) => {
      const [id, label] = Array.isArray(v) ? v : [v, v];
      return `<option value="${esc(id)}" ${id === value ? "selected" : ""}>${esc(label)}</option>`;
    })
    .join("")}</select></label>`;
const clientOptions = () => state.clients.map((c) => [c.id, c.name]);
const table = (headers, rows, empty = "No hay registros para mostrar.") =>
  `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((c) => `<tr>${c.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
const panel = (title, body) =>
  `<section class="panel"><h2>${title}</h2>${body}</section>`;
const metric = (label, value, note, route) =>
  `<a class="panel metric" href="#/${route}"><span class="metric-label">${label}</span><strong>${esc(value)}</strong><small>${note}</small></a>`;
const paths = {
  home: ["Inicio", "M3 10l9-7 9 7M5 9v12h14V9M9 21v-8h6v8"],
  attention: ["Atención", "M21 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 19 0Z"],
  clients: [
    "Clientes",
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4",
  ],
  pipeline: ["Ventas", "M4 20V10M10 20V4M16 20v-8M22 20H2"],
  agenda: ["Agenda", "M4 5h16v16H4ZM8 2v6M16 2v6M4 11h16"],
  quotes: ["Cotizaciones", "M6 3h12v18H6ZM9 8h6M9 12h6M9 16h4"],
  orders: ["Pedidos", "M3 7l9-5 9 5v10l-9 5-9-5ZM3 7l9 5 9-5M12 12v10"],
  approvals: ["Autorizaciones", "M5 12l4 4L19 6"],
  production: ["Producción", "M3 21V9l6 4V7l6 4V3h6v18Z"],
  inventory: [
    "Inventario",
    "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
  ],
  catalog: ["Catálogo", "M4 4h7v16H4ZM13 4h7v16h-7Z"],
  shipping: [
    "Despachos",
    "M1 4h14v13H1ZM15 9h4l4 4v4h-8M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  ],
  aftercare: ["Postventa", "M20 11a8 8 0 1 1-3-6M20 3v6h-6"],
  samples: ["Muestras", "M9 3h6M10 3v7l-6 10h16l-6-10V3"],
  reports: ["Reportes", "M4 20V10M10 20V4M16 20v-8M22 20H2"],
  automations: ["Automatizaciones", "M13 2L3 14h8l-1 8 11-13h-8Z"],
  team: [
    "Equipo y permisos",
    "M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6ZM8 12l3 3 5-6",
  ],
};
function current() {
  return location.hash.replace("#/", "").split("?")[0] || "home";
}
function toast(text) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.style.display = "none"), 4500);
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    toast(
      "No se pudo guardar en este navegador. Exporta tus datos para conservarlos.",
    );
  }
  if (cloudContext) {
    const snapshot = structuredClone(state);
    const context = cloudContext;
    cloudQueue = cloudQueue
      .then(() => pushCloudState(snapshot, context))
      .catch((error) => {
        console.error(error);
        toast("Los cambios quedaron guardados localmente, pero falta sincronizarlos.");
      });
  }
}
function head(title, sub, action = "") {
  return `<header class="page-head"><div><h1>${title}</h1><p>${sub}</p></div>${action}</header>`;
}
function modal(title, body) {
  dialog.innerHTML = `<div class="dialog-head"><h2>${title}</h2><button aria-label="Cerrar ventana" data-action="close">✕</button></div>${body}<p class="error" role="alert"></p>`;
  dialog.showModal();
}
function form(body, label = "Guardar") {
  return `<form id="edit-form">${body}<div class="actions">${btn("Cancelar", "close")}<button type="submit" class="primary">${label}</button></div></form>`;
}
function bindForm(fn) {
  dialog.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      fn(new FormData(e.currentTarget));
      save();
      dialog.close();
      render();
      toast("Cambios guardados en la demostración.");
    } catch (err) {
      dialog.querySelector(".error").textContent = err.message;
    }
  });
}
function render() {
  if (cloudEnabled && !cloudContext) {
    renderAuth();
    return;
  }
  const route = current();
  const profile = cloudContext
    ? `<strong>${esc(cloudContext.workspace.name)}</strong><small>${esc(cloudContext.user.email)}<br>${esc(cloudContext.roleLabel)} · Datos sincronizados</small>${btn("Cerrar sesión", "logout")}`
    : `<label>Simular perfil<select id="role">${["Dirección", "Administración", "Ventas", "Producción"].map((r) => `<option ${state.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></label><small>Datos guardados en este navegador.<br>Demostración · sin servicios conectados</small>`;
  const status = cloudContext
    ? badge("Supabase conectado")
    : badge("Modo demostración", "warn");
  const footer = cloudContext
    ? "CRM operativo · Datos protegidos por cuenta y espacio de trabajo · Sara usa respuestas simuladas."
    : "Prototipo funcional · Datos ficticios · Sara usa respuestas simuladas · No se envían mensajes externos.";
  app.innerHTML = `<aside class="sidebar" aria-label="Navegación principal"><a class="brand" href="#/home">HOTEL EXPERT<small>CRM & OPERACIÓN</small></a><p class="nav-label">${esc(state.role.toUpperCase())}</p><nav>${Object.entries(
    paths,
  )
    .map(
      ([id, [label, path]]) =>
        `<a href="#/${id}" class="nav-item ${id === route ? "active" : ""}" ${id === route ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${path}" stroke-linejoin="round" stroke-linecap="round"/></svg>${label}</a>`,
    )
    .join(
      "",
    )}</nav><div class="profile">${profile}</div></aside><main id="main"><div class="topbar"><button class="mobile-menu" aria-label="Abrir navegación" data-action="menu">☰</button><input class="search" id="search" aria-label="Buscar cliente, pedido u oportunidad" placeholder="Buscar cliente, pedido u oportunidad…" value="${esc(query)}">${status}${btn("Exportar datos", "export")}</div>${query ? searchView() : view(route)}<p class="demo">${footer}</p></main>`;
  document.querySelector("#role")?.addEventListener("change", (e) => {
    state.role = e.target.value;
    save();
    render();
  });
  document.querySelector("#search").addEventListener("input", (e) => {
    const pos = e.target.selectionStart;
    query = e.target.value;
    render();
    const input = document.querySelector("#search");
    input.focus();
    input.setSelectionRange(pos, pos);
  });
  if (route === "attention" && !query) {
    document
      .querySelector("#message-form")
      ?.addEventListener("submit", sendMessage);
    const m = document.querySelector(".messages");
    m.scrollTop = m.scrollHeight;
  }
  if (route === "quote-new" && !query) setupQuote();
}

function renderAuth(message = "") {
  const signup = authMode === "signup";
  app.innerHTML = `<main class="auth-shell"><section class="auth-card"><a class="brand auth-brand" href="#">HOTEL EXPERT<small>CRM & OPERACIÓN</small></a><p class="eyebrow">Acceso seguro</p><h1>${signup ? "Crear espacio de trabajo" : "Bienvenido al CRM"}</h1><p>${signup ? "Crea la cuenta principal de Hotel Expert. Esta cuenta tendrá el perfil de Dirección." : "Ingresa con tu correo y contraseña para abrir la operación comercial."}</p><form id="auth-form">${signup ? `${field("Nombre completo", "fullName", "", "text", 'required autocomplete="name"')}${field("Nombre del espacio", "workspaceName", "Hotel Expert", "text", 'required maxlength="120"')}` : ""}${field("Correo", "email", "", "email", 'required autocomplete="email"')}${field("Contraseña", "password", "", "password", `required minlength="8" autocomplete="${signup ? "new-password" : "current-password"}"`)}<p class="error" role="alert">${esc(message)}</p><button class="primary auth-submit" type="submit">${signup ? "Crear cuenta" : "Iniciar sesión"}</button></form><button class="auth-switch" data-action="auth-mode" data-id="${signup ? "signin" : "signup"}">${signup ? "Ya tengo una cuenta" : "Crear la cuenta principal"}</button><small>La sesión y los datos se protegen con Supabase Auth y permisos por perfil.</small></section></main>`;
  document.querySelector("#auth-form")?.addEventListener("submit", submitAuth);
}

async function submitAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button[type=submit]");
  const data = Object.fromEntries(new FormData(form));
  submit.disabled = true;
  submit.textContent = "Procesando…";
  try {
    if (authMode === "signup") {
      const result = await signUp({
        email: data.email.trim(),
        password: data.password,
        fullName: data.fullName.trim(),
        workspaceName: data.workspaceName.trim(),
      });
      if (!result.session) {
        authMode = "signin";
        renderAuth("Revisa tu correo para confirmar la cuenta y después inicia sesión.");
        return;
      }
    } else {
      await signIn(data.email.trim(), data.password);
    }
    await bootstrapCloud();
  } catch (error) {
    renderAuth(error.message || "No fue posible completar el acceso.");
  }
}
function view(route) {
  return (
    {
      home: homeView,
      attention: attentionView,
      clients: clientsView,
      pipeline: pipelineView,
      agenda: agendaView,
      quotes: quotesView,
      "quote-new": quoteView,
      orders: () => ordersView("all"),
      approvals: () => ordersView("approval"),
      production: () => ordersView("production"),
      inventory: inventoryView,
      catalog: catalogView,
      shipping: () => ordersView("shipping"),
      aftercare: aftercareView,
      samples: samplesView,
      reports: reportsView,
      automations: automationsView,
      team: teamView,
      client: clientView,
    }[route] || homeView
  )();
}
function homeView() {
  const count = (s) => state.orders.filter((o) => o.status === s).length;
  const dormant = dormantClients(state);
  const late = state.orders.filter(
    (o) =>
      o.status !== "Entregado" &&
      o.due &&
      o.due < new Date().toISOString().slice(0, 10),
  ).length;
  return (
    head(
      "Tu operación de hoy",
      `${new Intl.DateTimeFormat("es-MX", { dateStyle: "full" }).format(new Date())} · Resumen de ${esc(state.role.toLowerCase())}`,
    ) +
    `<div class="grid four">${metric("Por preparar", count("En producción"), "Pedidos en producción", "production")}${metric("Por enviar", count("Empacado"), "Listos para despacho", "shipping")}${metric("Enviadas", count("En tránsito"), "En tránsito con guía", "shipping")}${metric("Entregas atrasadas", late, "Revisar fecha comprometida", "orders")}</div><div class="grid four">${metric("Facturación registrada", money(state.orders.reduce((s, o) => s + o.invoiceAmount, 0)), "Importes demo · distinto de ventas", "reports")}${metric("Clientes nuevos", state.clients.filter((c) => new Date() - new Date(c.created) < 30 * 86400000).length, "Altas en los últimos 30 días", "clients")}${metric("Prospectos nuevos", state.opportunities.filter((o) => o.stage === 0).length, "Pendientes de calificar", "pipeline")}${metric("Sin recompra >30 días", dormant.length, "Priorizar seguimiento", "aftercare")}</div><div class="banner"><span>Entregadas: <strong>${count("Entregado")}</strong></span><span>Pedidos por autorizar: <strong>${count("Por autorizar")}</strong></span><span>Ventas autorizadas: <strong>${money(state.orders.filter((o) => o.status !== "Por autorizar").reduce((s, o) => s + o.total, 0))}</strong></span></div><div class="grid two">${panel("Sara IA · Acciones prioritarias", `<p>${state.conversations.filter((c) => c.human).length} conversaciones necesitan una persona.</p><p>${state.quotes.filter((q) => q.status === "Borrador").length} cotizaciones en borrador.</p><p>${dormant.length} clientes llevan más de 30 días sin comprar.</p><div class="actions">${go("Abrir atención", "attention")}</div>`)}${panel(
      "Agenda y actividad comercial",
      state.appointments.length
        ? state.appointments
            .slice(0, 3)
            .map(
              (a) =>
                `<p>${esc(new Date(a.start).toLocaleString("es-MX"))} · ${esc(cname(a.clientId))} · ${esc(a.owner)}</p>`,
            )
            .join("")
        : "<p>No hay citas agendadas. Programa una llamada cuando ayude a cerrar la venta.</p>",
    )}</div><div class="actions">${go("Autorizar pedidos", "approvals", true)}${go("Ver agenda", "agenda")}${go("Ver reportes", "reports")}${go("Pipeline comercial", "pipeline")}</div>`
  );
}
function pipelineView() {
  return (
    head(
      "Ventas con Sara IA",
      "Venta directa como primera opción · Muestra opcional cuando ayude a decidir.",
      btn("Nueva oportunidad", "new-op", "", true),
    ) +
    `<div class="tabs">${[
      ["all", "Todas"],
      ["direct", "Venta directa"],
      ["sample", "Con muestra"],
    ]
      .map(
        ([id, label]) =>
          `<button data-action="route-filter" data-id="${id}" aria-pressed="${routeFilter === id}">${label}</button>`,
      )
      .join(
        "",
      )}${go("Cotizaciones", "quotes")}</div><div class="kanban">${stages
      .map(
        (stage, i) =>
          `<section class="column"><h3>${i + 1} · ${stage}</h3><p>${["Identifica necesidades del hotel", "Productos, aromas y cobertura", "Precios y condiciones aprobados", "Aceptación y creación de pedido"][i]}</p>${
            state.opportunities
              .filter(
                (o) =>
                  o.stage === i &&
                  (routeFilter === "all" || o.route === routeFilter),
              )
              .map(
                (o) =>
                  `<article class="op-card"><h3>${esc(cname(o.clientId))}</h3>${badge(o.route === "direct" ? "Venta directa" : "Muestra opcional", o.route === "sample" ? "warn" : "")}<p>${money(o.amount)} · ${esc(o.owner)}</p><p>${esc(o.next)}</p>${btn("Abrir oportunidad", "op", o.id)}</article>`,
              )
              .join("") || '<p class="empty">Sin oportunidades</p>'
          }</section>`,
      )
      .join(
        "",
      )}</div><div class="banner"><div><h3>Muestra solo cuando ayude a decidir</h3><p>Solicitud → Envío → Evaluación → Cotización. Si decide comprar antes, continúa directo al pedido.</p></div>${go("Ver muestras", "samples")}</div>${panel("Después del cierre", "<p>Pedido confirmado → Revisión administrativa → Producción → Envío → Entrega → Postventa y recompra</p>")}`
  );
}
function clientsView() {
  return (
    head(
      "Clientes y hoteles",
      "Una cartera conectada, desde el primer contacto hasta la recompra.",
      btn("Nuevo cliente", "edit-client", "", true),
    ) +
    panel(
      "Cartera comercial",
      table(
        ["Hotel / empresa", "Contacto", "Canal", "Responsable", ""],
        state.clients.map((c) => [
          esc(c.name),
          `${esc(c.contact)}<small>${esc(c.position)}</small>`,
          esc(c.channel),
          esc(c.owner),
          btn("Ver expediente", "client", c.id),
        ]),
      ),
    )
  );
}
function clientView() {
  const c = client(selectedClient) || state.clients[0];
  return (
    head(
      esc(c.name),
      `Expediente único · Responsable humano: ${esc(c.owner)} · Atención: Sara IA`,
      btn("Editar datos", "edit-client", c.id, true),
    ) +
    `<div class="grid two">${panel(
      "Datos fiscales y envío",
      `<div class="detail-list">${[
        ["Nombre comercial", c.name],
        ["Razón social", c.legal],
        ["RFC", c.rfc],
        ["Dirección de envío", c.address],
      ]
        .map(
          ([a, b]) =>
            `<div><small>${a}</small>${esc(b) || badge("Pendiente", "warn")}</div>`,
        )
        .join("")}</div>`,
    )}${panel(
      "Contacto principal",
      `<div class="detail-list">${[
        ["Nombre y puesto", `${c.contact} · ${c.position}`],
        ["Celular / WhatsApp", c.phone],
        ["Correo", c.email],
        ["Aroma preferido", c.aroma],
      ]
        .map(
          ([a, b]) =>
            `<div><small>${a}</small>${esc(b) || badge("Pendiente", "warn")}</div>`,
        )
        .join("")}</div>`,
    )}</div><div class="grid two">${panel("Información comercial", `<p>${esc(c.notes)}</p><p>Última compra: ${esc(c.lastOrder || "Sin compra registrada")}</p><div class="actions">${btn("Abrir conversación", "chat", c.id)}${go("Consultar catálogo", "catalog")}</div>`)}${panel(
      "Pedidos e historial",
      table(
        ["Pedido", "Estado", "Total"],
        state.orders
          .filter((o) => o.clientId === c.id)
          .map((o) => [esc(o.id), badge(o.status), money(o.total)]),
      ),
    )}</div>`
  );
}
function conversation() {
  let c = state.conversations.find((c) => c.clientId === selectedClient);
  if (!c) {
    c = {
      id: uid("chat"),
      clientId: selectedClient,
      human: false,
      messages: [],
    };
    state.conversations.push(c);
  }
  return c;
}
function attentionView() {
  const chat = conversation(),
    c = client(selectedClient) || state.clients[0];
  return (
    head(
      "Atención omnicanal",
      "Sara asesora y busca cerrar la venta; transfiere al equipo cuando hace falta.",
    ) +
    `<div class="chat-grid"><section class="panel chat-list"><h2>Conversaciones</h2>${state.clients.map((c) => `<button data-action="chat" data-id="${c.id}" ${c.id === selectedClient ? 'class="primary"' : ""}>${esc(c.name)}<small>${esc(c.contact)} · ${esc(c.channel)}</small></button>`).join("")}</section><section class="panel"><h2>${esc(c.contact)} · ${esc(c.name)}</h2>${badge(chat.human ? "Atención humana · Sara en pausa" : "Atiende Sara IA · Simulación", chat.human ? "warn" : "")}<div class="messages" aria-live="polite">${chat.messages.map((m) => `<article class="message ${m.by !== "Cliente" ? "assistant" : ""}"><strong>${esc(m.by)}</strong><p>${esc(m.text)}</p></article>`).join("") || "<p>Inicia una conversación de demostración.</p>"}</div><form class="compose" id="message-form"><input name="message" aria-label="Mensaje de prueba del cliente" placeholder="Simular mensaje del cliente…" required maxlength="2000"><button class="primary">Simular</button></form><p><small>Este simulador recibe mensajes de prueba. No está conectado a WhatsApp.</small></p></section><aside class="panel chat-context"><h2>Contexto comercial</h2><p>${esc(c.notes)}</p><p>Responsable humano: ${esc(c.owner)}</p><div class="actions">${btn(chat.human ? "Reanudar Sara" : "Transferir a vendedor", "handoff", chat.id)}${go("Productos y aromas", "catalog")}${go("Preparar cotización", "quote-new")}${btn("Ver expediente", "client", c.id)}${go("Agendar llamada", "agenda")}</div><div class="settings-note"><h3>Venta directa primero</h3><p>La muestra y la llamada son alternativas. Sara usa información aprobada y escala las excepciones.</p></div></aside></div>`
  );
}
function sendMessage(e) {
  e.preventDefault();
  const message = new FormData(e.currentTarget).get("message").trim();
  if (!message) return;
  const chat = conversation();
  chat.messages.push({ by: "Cliente", text: message });
  const result = responseFor(message, state, chat.human);
  if (result) {
    chat.messages.push({ by: "Sara IA · Demo", text: result.text });
    if (result.handoff) chat.human = true;
  }
  save();
  render();
}
function catalogView() {
  return (
    head(
      "Catálogo y conocimiento de Sara",
      "Información comercial aprobada para asesorar y preparar propuestas.",
    ) +
    `<div class="grid three">${state.products.map((p) => panel(esc(p.name), `<div class="product-art">HOTEL EXPERT · ELAH</div><p>${esc(p.size)} · ${esc(p.sku)}</p><div class="price">${money(p.price)}</div>${badge("Precio de demostración", "warn")}<p>Ficha técnica y aplicación: pendientes de validar.</p><div class="actions">${go("Cotizar", "quote-new")}</div>`)).join("")}</div><div class="grid two">${panel("Aromas · Catálogo aprobado", state.aromas.length ? state.aromas.map((a) => `<p><strong>${esc(a.name)}</strong> · ${esc(a.family)}<br>${esc(a.notes)} · ${esc(a.intensity)}<br>Uso: ${esc(a.areas)}</p>`).join("") : "<p>El documento del cliente no incluye los aromas reales. Carga nombre, familia, notas, intensidad, áreas recomendadas y productos compatibles antes de recomendarlos.</p>")}${panel("Preguntas frecuentes de Sara", "<p>¿Qué es el Sistema ELAH?<br>¿Cuánto cuesta y qué incluye?<br>¿Qué aromas hay disponibles?<br>¿Envían a mi código postal?</p><p>Las respuestas comerciales requieren fichas aprobadas. Sara no inventa cobertura, plazos ni beneficios.</p>")}</div><div class="actions">${btn("Registrar aroma aprobado", "new-aroma", "", true)}${go("Venta directa", "quote-new")}${go("Muestra opcional", "samples")}</div>`
  );
}
function quotesView() {
  return (
    head(
      "Cotizaciones",
      "Versiones, condiciones y aceptación del cliente.",
      go("Nueva cotización", "quote-new", true),
    ) +
    panel(
      "Propuestas comerciales",
      table(
        ["Cotización", "Cliente", "Total productos", "Estado", "Acciones"],
        state.quotes.map((q) => [
          esc(q.id),
          esc(cname(q.clientId)),
          money(q.total),
          badge(q.status, q.status === "Borrador" ? "warn" : "good"),
          `<div class="actions">${btn("Ver propuesta", "quote-detail", q.id)}${q.status === "Borrador" ? btn("Registrar aceptación", "accept-quote", q.id) : btn("Crear pedido", "quote-order", q.id)}</div>`,
        ]),
        "Aún no hay cotizaciones. Crea una propuesta desde el catálogo.",
      ),
    )
  );
}
function quoteView() {
  return (
    head(
      "Crear cotización",
      "Precios de demostración · Aroma por producto · Venta directa con Sara IA",
    ) +
    `<form id="quote-form"><div class="grid two"><section class="panel"><h2>Productos y condiciones</h2>${select("Cliente", "clientId", clientOptions(), selectedClient)}<div class="quote-lines" id="quote-lines"></div>${btn("+ Agregar producto", "add-line")}<div class="field-grid form-summary">${field("Vigencia", "validUntil", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), "date", "required")}${select("Canal de confirmación", "channel", ["WhatsApp", "Correo"])}${field("Condiciones de pago", "payment", "Contado", "text", "required")}${field("Costo de envío confirmado (MXN)", "shipping", "", "number", 'min="0" step="0.01"')}<label class="wide">Nota de entrega<textarea name="delivery" placeholder="Confirmar cobertura, fecha y dirección con el cliente"></textarea></label></div></section><section class="panel raised"><h2>Resumen</h2><div class="quote-total" id="quote-total">$0.00</div><p>Total de productos. Envío e impuestos se muestran por separado y deben confirmarse.</p>${field("Descuento (%)", "discount", 0, "number", `min="0" max="${state.discountLimit}" step="0.1"`)}<div class="settings-note"><h3>Política de descuentos</h3><p>Máximo autorizado: ${state.discountLimit}%. Dirección configura la política. Las excepciones se revisan con una persona.</p></div><p id="quote-warning" class="error" role="alert"></p><button class="primary" type="submit">Guardar borrador</button><p>Guardar no envía mensajes ni confirma una compra.</p></section></div></form>`
  );
}
function quoteLine() {
  return `<div class="quote-line">${select(
    "Producto",
    "product",
    state.products.map((p) => [p.id, `${p.name} · ${p.size}`]),
  )}${field("Cantidad", "quantity", 1, "number", 'min="1" step="1" required')}${select("Aroma", "aroma", [["", "Por confirmar"], ...state.aromas.map((a) => [a.id, a.name])])}<button type="button" data-action="remove-line" aria-label="Quitar producto">✕</button></div>`;
}
function setupQuote() {
  const form = document.querySelector("#quote-form");
  document.querySelector("#quote-lines").innerHTML = quoteLine();
  form.addEventListener("input", updateTotal);
  form.addEventListener("change", updateTotal);
  updateTotal();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const d = new FormData(form),
        lines = readLines();
      const sum = totals(lines, Number(d.get("discount")), state.discountLimit);
      if (new Date(`${d.get("validUntil")}T23:59:59`) < new Date())
        throw new Error("La vigencia debe ser hoy o posterior.");
      const q = {
        id: uid("COT"),
        clientId: d.get("clientId"),
        lines,
        ...sum,
        validUntil: d.get("validUntil"),
        payment: d.get("payment").trim(),
        shipping: d.get("shipping") === "" ? null : Number(d.get("shipping")),
        delivery: d.get("delivery").trim(),
        channel: d.get("channel"),
        status: "Borrador",
        version: 1,
        created: new Date().toISOString(),
      };
      state.quotes.push(q);
      audit(state, `Cotización guardada: ${q.id}`);
      save();
      location.hash = "/quotes";
      toast("Borrador guardado. Revisa aromas y condiciones antes de aceptar.");
    } catch (err) {
      document.querySelector("#quote-warning").textContent = err.message;
    }
  });
}
function readLines() {
  return [...document.querySelectorAll(".quote-line")].map((row) => {
    const p = state.products.find(
      (p) => p.id === row.querySelector("[name=product]").value,
    );
    const aromaId = row.querySelector("[name=aroma]").value;
    const a = state.aromas.find((a) => a.id === aromaId);
    if (a && !a.products.includes(p.id))
      throw new Error(
        "El aroma seleccionado no es compatible con ese producto.",
      );
    return {
      productId: p.id,
      name: p.name,
      price: p.price,
      quantity: Number(row.querySelector("[name=quantity]").value),
      aromaId,
      aroma: a?.name || "Por confirmar",
    };
  });
}
function updateTotal() {
  try {
    const total = totals(
      readLines(),
      Number(document.querySelector("[name=discount]").value),
      state.discountLimit,
    );
    document.querySelector("#quote-total").textContent = money(total.total);
    document.querySelector("#quote-warning").textContent = "";
  } catch (err) {
    document.querySelector("#quote-warning").textContent = err.message;
  }
}
function ordersView(filter) {
  const config = {
    all: ["Pedidos", "Todas las compras, con confirmación y trazabilidad."],
    approval: [
      "Autorizar pedidos",
      "Administración revisa antes de liberar producción.",
    ],
    production: ["Producción", "Elaboración y empaque de pedidos autorizados."],
    shipping: [
      "Despachos",
      "Administración captura la guía y confirma la entrega.",
    ],
  }[filter];
  let orders = state.orders.filter(
    (o) =>
      filter === "all" ||
      (filter === "approval" && o.status === "Por autorizar") ||
      (filter === "production" &&
        ["En producción", "Empacado"].includes(o.status)) ||
      (filter === "shipping" &&
        ["Empacado", "En tránsito", "Entregado"].includes(o.status)),
  );
  return (
    head(...config) +
    panel(
      "Pedidos del periodo",
      table(
        ["Pedido / cliente", "Total", "Estado", "Entrega / guía", ""],
        orders.map((o) => [
          `${esc(o.id)}<small>${esc(cname(o.clientId))}</small>`,
          money(o.total),
          badge(o.status, o.status === "Por autorizar" ? "warn" : ""),
          `${esc(o.due || "Fecha pendiente")}<small>${esc(o.tracking || "Sin guía")}</small>`,
          btn("Ver avance", "order", o.id),
        ]),
      ),
    ) +
    `<div class="actions">${go("Crear desde cotización", "quotes", true)}${go("Ver avisos al cliente", "automations")}</div>`
  );
}
function samplesView() {
  return (
    head(
      "Muestras y demostraciones",
      "Ruta opcional: el cliente puede comprar sin esperar el resultado.",
      btn("Nueva solicitud", "sample-new", "", true),
    ) +
    panel(
      "Seguimiento de muestras",
      table(
        ["Muestra / cliente", "Estado", "Aroma / guía", "Resultado", ""],
        state.samples.map((s) => [
          `${esc(s.id)}<small>${esc(cname(s.clientId))}</small>`,
          badge(s.status),
          `${esc(s.aroma)}<small>${esc(s.tracking || "Sin guía")}</small>`,
          esc(s.result || "Pendiente"),
          btn("Dar seguimiento", "sample", s.id),
        ]),
      ),
    ) +
    `<div class="banner"><div><h3>Una sola oportunidad comercial</h3><p>La muestra queda vinculada al prospecto. Puedes volver a venta directa sin duplicar al cliente.</p></div>${go("Volver al pipeline", "pipeline")}</div>`
  );
}
function agendaView() {
  return (
    head(
      "Agenda comercial",
      "Llamadas, visitas y videollamadas · Se evitan citas simultáneas para un vendedor.",
      btn("Agendar cita", "new-appointment", "", true),
    ) +
    panel(
      "Próximas citas",
      table(
        ["Cliente", "Vendedor", "Fecha", "Duración / tipo", ""],
        [...state.appointments]
          .sort((a, b) => new Date(a.start) - new Date(b.start))
          .map((a) => [
            esc(cname(a.clientId)),
            esc(a.owner),
            esc(new Date(a.start).toLocaleString("es-MX")),
            `${a.duration} min · ${esc(a.type)}`,
            btn("Cancelar cita", "cancel-appointment", a.id),
          ]),
      ),
    ) +
    `<p>La disponibilidad mostrada corresponde a esta demostración. La conexión con calendarios externos está pendiente.</p>`
  );
}
function aftercareView() {
  return (
    head(
      "Postventa y recompra",
      "Acompaña cada entrega y prioriza clientes sin compra en más de 30 días.",
    ) +
    panel(
      "Clientes para seguimiento",
      table(
        ["Cliente", "Última compra", "Responsable", ""],
        dormantClients(state).map((c) => [
          esc(c.name),
          esc(c.lastOrder),
          esc(c.owner),
          btn("Preparar seguimiento", "followup", c.id),
        ]),
      ),
    ) +
    `<div class="grid two" style="margin-top:20px">${panel(
      "Tareas pendientes",
      table(
        ["Cliente", "Motivo", ""],
        state.tasks.map((t) => [
          esc(cname(t.clientId)),
          esc(t.title),
          btn("Completar", "complete-task", t.id),
        ]),
      ),
    )}${panel("Seguimiento responsable", "<p>Las incidencias se vinculan al pedido. Las tareas de recompra no generan pedidos automáticamente.</p><p>Los avisos de producción, envío y entrega quedan en la cola de comunicación.</p>" + go("Ver avisos", "automations"))}</div>`
  );
}
function reportsView() {
  const ops = state.opportunities.filter(
    (o) => Date.now() - new Date(o.created).getTime() <= period * 86400000,
  );
  const rate = (route) => {
    const all = ops.filter((o) => o.route === route),
      won = all.filter((o) =>
        state.orders.some(
          (order) => order.opportunityId === o.id && order.confirmed,
        ),
      );
    return `${won.length} / ${all.length} · ${all.length ? Math.round((won.length / all.length) * 100) : 0}%`;
  };
  return (
    head(
      "Reportes comerciales",
      "Comparación por ruta y seguimiento de cartera.",
    ) +
    `<div class="tabs">${[7, 30].map((n) => `<button data-action="period" data-id="${n}" aria-pressed="${period === n}">${n === 7 ? "Semanal" : "Mensual"} · ${n} días</button>`).join("")}</div><div class="grid four">${metric("Venta directa", rate("direct"), "Pedidos / oportunidades del periodo", "pipeline")}${metric("Ruta con muestra", rate("sample"), "Pedidos / oportunidades del periodo", "samples")}${metric("Nuevos clientes", state.clients.filter((c) => Date.now() - new Date(c.created) <= period * 86400000).length, "Altas del periodo", "clients")}${metric("Sin recompra >30 días", dormantClients(state).length, "Cartera actual · no depende del periodo", "aftercare")}</div>${panel(
      "Prospectos y avance",
      table(
        ["Etapa", "Oportunidades", "Valor estimado"],
        stages.map((s, i) => [
          s,
          ops.filter((o) => o.stage === i).length,
          money(
            ops
              .filter((o) => o.stage === i)
              .reduce((sum, o) => sum + o.amount, 0),
          ),
        ]),
      ),
    )}<div class="settings-note"><p>Conversión = oportunidades con pedido confirmado / oportunidades creadas en el periodo, agrupadas por ruta actual. Una oportunidad en confirmación aún no es una venta si no tiene pedido.</p></div>`
  );
}
function automationsView() {
  return (
    head(
      "Automatizaciones",
      "Seguimiento de pedidos y mensajes al cliente desde un solo lugar.",
    ) +
    `<div class="banner"><div><h3>Integraciones pendientes</h3><p>Los eventos se registran localmente. No se envían WhatsApp ni correos y no se ejecuta un agente real.</p></div>${badge("Sin conexión", "warn")}</div>` +
    panel(
      "Avisos generados por la operación",
      table(
        ["Pedido", "Evento", "Estado", "Fecha"],
        state.notifications.map((n) => [
          esc(n.orderId),
          esc(n.event),
          badge(n.status, "warn"),
          esc(new Date(n.at).toLocaleString("es-MX")),
        ]),
        "Al confirmar o avanzar un pedido aparecerá aquí su aviso.",
      ),
    ) +
    `<div class="settings-note"><p>Confirmación → Producción → Envío con guía → Entrega → Postventa. Cada evento se registra una vez por pedido.</p></div>`
  );
}
function inventoryView() {
  return (
    head(
      "Inventario",
      "Presentaciones del catálogo y control operativo pendiente de conexión.",
    ) +
    panel(
      "Productos disponibles en la demostración",
      table(
        ["SKU", "Producto", "Existencias"],
        state.products.map((p) => [
          esc(p.sku),
          esc(p.name) + " · " + esc(p.size),
          badge("Sin fuente conectada", "warn"),
        ]),
      ),
    ) +
    `<div class="settings-note"><p>No hay cantidades reales de inventario en el repositorio. Antes de activar ventas reales, deben integrarse movimientos, reservas, fórmulas y materiales de producción.</p></div>`
  );
}
function teamView() {
  const storagePanel = cloudContext
    ? panel(
        "Cuenta y respaldo",
        `<p>Los cambios se sincronizan con el espacio <strong>${esc(cloudContext.workspace.name)}</strong>. También puedes descargar un respaldo en JSON.</p><div class="actions">${btn("Exportar datos", "export")}</div>`,
      )
    : panel(
        "Datos de demostración",
        `<p>Los cambios solo se guardan en este navegador. No uses datos reales de clientes en este prototipo.</p><div class="actions">${btn("Exportar datos", "export")}${btn("Reiniciar demo", "reset")}</div>`,
      );
  return (
    head(
      "Equipo y permisos",
      cloudContext
        ? "Acceso protegido por espacio de trabajo y perfil."
        : "Perfiles de demostración · La autorización real debe implementarse en servidor.",
    ) +
    panel(
      "Responsabilidades",
      table(
        ["Perfil", "Responsabilidad"],
        [
          ["Dirección", "Define política de descuentos y supervisa resultados"],
          [
            "Administración",
            "Autoriza pedidos y muestras; registra guía y entrega",
          ],
          ["Ventas", "Gestiona clientes, cotizaciones, agenda y seguimiento"],
          ["Producción", "Registra elaboración y empaque"],
          [
            "Sara IA",
            "Asesora con información aprobada; confirma intención y transfiere excepciones",
          ],
        ],
      ),
    ) +
    `<div class="grid two" style="margin-top:20px">${panel("Reglas comerciales", `<p>Límite de descuento: <strong>${state.discountLimit}%</strong></p><p>Inicialmente 0% hasta que dirección registre la política.</p>${btn("Configurar descuento", "discount-policy")}`)}${storagePanel}</div>${panel(
      "Historial de cambios",
      table(
        ["Fecha", "Perfil", "Acción"],
        state.audit
          .slice(0, 20)
          .map((a) => [
            esc(new Date(a.at).toLocaleString("es-MX")),
            esc(a.actor),
            esc(a.action),
          ]),
      ),
    )}`
  );
}
function searchView() {
  const q = query.toLowerCase();
  const clients = state.clients.filter((c) =>
    [c.name, c.contact, c.phone, c.email].some((v) =>
      v.toLowerCase().includes(q),
    ),
  );
  const orders = state.orders.filter((o) =>
    `${o.id} ${cname(o.clientId)}`.toLowerCase().includes(q),
  );
  return (
    head("Resultados de búsqueda", `Coincidencias para “${esc(query)}”`) +
    panel(
      "Clientes",
      table(
        ["Cliente", "Contacto", ""],
        clients.map((c) => [
          esc(c.name),
          esc(c.contact),
          btn("Ver expediente", "client", c.id),
        ]),
      ),
    ) +
    `<div style="margin-top:20px">${panel(
      "Pedidos",
      table(
        ["Pedido", "Cliente", ""],
        orders.map((o) => [
          esc(o.id),
          esc(cname(o.clientId)),
          btn("Ver pedido", "order", o.id),
        ]),
      ),
    )}</div>`
  );
}
document.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  if (button.dataset.go) {
    query = "";
    location.hash = "/" + button.dataset.go;
    return;
  }
  const { action, id } = button.dataset;
  if (!action) return;
  e.preventDefault();
  try {
    handle(action, id, button);
  } catch (err) {
    if (dialog.open) dialog.querySelector(".error").textContent = err.message;
    else toast(err.message);
  }
});
function handle(action, id, button) {
  if (action === "auth-mode") {
    authMode = id;
    renderAuth();
    return;
  }
  if (action === "logout") {
    signOut().catch((error) => toast(error.message));
    return;
  }
  if (action === "close") {
    dialog.close();
    return;
  }
  if (action === "menu") {
    document.querySelector(".sidebar").classList.toggle("open");
    return;
  }
  if (action === "route-filter") {
    routeFilter = id;
    render();
    return;
  }
  if (action === "period") {
    period = Number(id);
    render();
    return;
  }
  if (action === "client" || action === "chat") {
    selectedClient = id;
    query = "";
    location.hash = action === "client" ? "/client" : "/attention";
    render();
    return;
  }
  if (action === "edit-client") {
    const c = client(id) || {};
    modal(
      id ? "Editar cliente" : "Nuevo cliente",
      form(
        `<div class="field-grid">${field("Nombre comercial *", "name", c.name, "text", 'required maxlength="120"')}${field("Razón social", "legal", c.legal)}${field("RFC", "rfc", c.rfc, "text", 'maxlength="13"')}${field("Dirección de envío", "address", c.address)}${field("Contacto *", "contact", c.contact, "text", "required")}${field("Puesto", "position", c.position)}${field("Celular / WhatsApp", "phone", c.phone, "tel")}${field("Correo", "email", c.email, "email")}${select("Responsable", "owner", ["Eli", "Vendedor 2"], c.owner)}${select("Canal", "channel", ["WhatsApp", "Instagram", "Facebook", "Web", "Correo"], c.channel)}${field("Aroma preferido", "aroma", c.aroma)}<label class="wide">Notas<textarea name="notes">${esc(c.notes)}</textarea></label></div>`,
      ),
    );
    bindForm((d) => {
      const values = Object.fromEntries([...d].map(([k, v]) => [k, v.trim()]));
      if (!values.name || !values.contact)
        throw new Error("Nombre comercial y contacto son obligatorios.");
      if (values.rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(values.rfc))
        throw new Error("Revisa el formato del RFC.");
      if (id) Object.assign(c, values);
      else
        state.clients.push({
          ...values,
          id: uid("c"),
          created: new Date().toISOString().slice(0, 10),
          lastOrder: null,
        });
      audit(state, `Cliente guardado: ${values.name}`);
    });
    return;
  }
  if (action === "new-op") {
    modal(
      "Nueva oportunidad",
      form(
        `<div class="field-grid">${select("Cliente", "clientId", clientOptions(), selectedClient)}${field("Valor estimado (MXN)", "amount", 0, "number", 'min="0" step="0.01" required')}${select("Responsable", "owner", ["Sara IA", "Eli", "Vendedor 2"])}${select(
          "Ruta inicial",
          "route",
          [
            ["direct", "Venta directa"],
            ["sample", "Con muestra opcional"],
          ],
        )}${field("Próxima acción", "next", "Identificar necesidades", "text", "required")}</div>`,
      ),
    );
    bindForm((d) => {
      const o = {
        ...Object.fromEntries(d),
        id: uid("op"),
        stage: 0,
        amount: Number(d.get("amount")),
        created: new Date().toISOString().slice(0, 10),
      };
      state.opportunities.push(o);
      if (o.route === "sample") requestSample(state, o.id);
      audit(state, `Oportunidad creada: ${o.id}`);
    });
    return;
  }
  if (action === "op") {
    const o = state.opportunities.find((o) => o.id === id);
    modal(
      esc(cname(o.clientId)),
      form(
        `<div class="field-grid">${select(
          "Etapa",
          "stage",
          stages.map((s, i) => [String(i), s]),
          String(o.stage),
        )}${select("Responsable", "owner", ["Sara IA", "Eli", "Vendedor 2"], o.owner)}${field("Valor estimado (MXN)", "amount", o.amount, "number", 'min="0" step="0.01"')}${field("Próxima acción", "next", o.next, "text", "required")}</div><div class="settings-note"><p>Ruta actual: ${o.route === "direct" ? "Venta directa" : "Con muestra"}. La llamada y la muestra no son obligatorias.</p></div><div class="actions">${btn("Solicitar muestra", "op-sample", id)}${btn("Seguir sin muestra", "op-direct", id)}${btn("Preparar cotización", "op-quote", id)}</div>`,
      ),
    );
    bindForm((d) => {
      Object.assign(o, {
        stage: Number(d.get("stage")),
        owner: d.get("owner"),
        amount: Number(d.get("amount")),
        next: d.get("next").trim(),
      });
      audit(state, `Oportunidad actualizada: ${id}`);
    });
    return;
  }
  if (action === "op-sample") {
    requestSample(state, id);
    save();
    dialog.close();
    location.hash = "/samples";
    render();
    return;
  }
  if (action === "op-direct") {
    directRoute(state, id);
    save();
    dialog.close();
    render();
    toast("Venta directa: puedes continuar sin esperar la muestra.");
    return;
  }
  if (action === "op-quote") {
    selectedClient = state.opportunities.find((o) => o.id === id).clientId;
    dialog.close();
    location.hash = "/quote-new";
    return;
  }
  if (action === "handoff") {
    const c = state.conversations.find((c) => c.id === id);
    c.human = !c.human;
    c.messages.push({
      by: "Sistema",
      text: c.human
        ? "Sara en pausa. El vendedor recibe el historial y contexto del cliente."
        : "Sara reanudada por el equipo.",
    });
    audit(state, c.human ? "Transferencia a vendedor" : "Sara reanudada");
    save();
    render();
    return;
  }
  if (action === "new-aroma") {
    if (!["Dirección", "Administración"].includes(state.role))
      throw new Error("Administración registra el catálogo aprobado.");
    modal(
      "Registrar aroma aprobado",
      form(
        `<div class="field-grid">${field("Nombre *", "name", "", "text", "required")}${field("Familia olfativa *", "family", "", "text", "required")}${field("Notas aromáticas *", "notes", "", "text", "required")}${select("Intensidad", "intensity", ["Suave", "Media", "Alta"])}${field("Áreas recomendadas *", "areas", "", "text", "required")}<div class="wide"><p>Productos compatibles</p>${state.products.map((p) => `<label class="check"><input type="checkbox" name="products" value="${p.id}">${esc(p.name)}</label>`).join("")}</div><label class="check wide"><input type="checkbox" name="approved" required>Confirmo que los datos provienen de una ficha aprobada.</label></div>`,
      ),
    );
    bindForm((d) => {
      if (!d.getAll("products").length)
        throw new Error("Selecciona al menos un producto compatible.");
      state.aromas.push({
        id: uid("aroma"),
        name: d.get("name").trim(),
        family: d.get("family").trim(),
        notes: d.get("notes").trim(),
        intensity: d.get("intensity"),
        areas: d.get("areas").trim(),
        products: d.getAll("products"),
        approved: true,
      });
      audit(state, "Aroma aprobado registrado");
    });
    return;
  }
  if (action === "add-line") {
    document
      .querySelector("#quote-lines")
      .insertAdjacentHTML("beforeend", quoteLine());
    updateTotal();
    return;
  }
  if (action === "remove-line") {
    if (document.querySelectorAll(".quote-line").length === 1)
      throw new Error("La cotización necesita al menos un producto.");
    button.closest(".quote-line").remove();
    updateTotal();
    return;
  }
  if (action === "quote-detail") {
    const q = state.quotes.find((q) => q.id === id);
    modal(
      `Cotización ${esc(q.id)}`,
      `<p>${esc(cname(q.clientId))} · Versión ${q.version} · ${esc(q.status)}</p>${table(
        ["Producto", "Cantidad", "Aroma", "Importe"],
        q.lines.map((l) => [
          esc(l.name),
          l.quantity,
          esc(l.aroma),
          money(l.quantity * l.price),
        ]),
      )}<p>Total de productos: <strong>${money(q.total)}</strong><br>Descuento: ${q.discount}%<br>Envío: ${q.shipping === null ? "Por confirmar" : money(q.shipping)}<br>Impuestos: por confirmar<br>Pago: ${esc(q.payment)}<br>Vigencia: ${esc(q.validUntil)}<br>${esc(q.delivery)}</p><div class="actions">${btn("Descargar propuesta", "download-quote", id)}${btn("Cerrar", "close")}</div>`,
    );
    return;
  }
  if (action === "download-quote") {
    const q = state.quotes.find((q) => q.id === id);
    download(
      `${q.id}.txt`,
      `HOTEL EXPERT · COTIZACIÓN DE DEMOSTRACIÓN\n${q.id} · Versión ${q.version}\nCliente: ${cname(q.clientId)}\n${q.lines.map((l) => `${l.name} · ${l.quantity} · ${l.aroma} · ${money(l.price * l.quantity)}`).join("\n")}\nTotal productos: ${money(q.total)}\nDescuento: ${q.discount}%\nEnvío: ${q.shipping === null ? "Por confirmar" : money(q.shipping)}\nImpuestos: por confirmar\nCondiciones: ${q.payment}\nVigencia: ${q.validUntil}\n${q.delivery}`,
      "text/plain",
    );
    return;
  }
  if (action === "accept-quote") {
    const q = state.quotes.find((q) => q.id === id);
    if (q.lines.some((l) => !l.aromaId))
      throw new Error(
        "Falta confirmar el aroma por producto. Carga el catálogo aprobado y prepara una nueva cotización.",
      );
    if (new Date(`${q.validUntil}T23:59:59`) < new Date())
      throw new Error("Cotización vencida. Crea una nueva propuesta.");
    const c = client(q.clientId);
    if (!c.legal || !c.rfc || !c.address || !c.phone || !c.email)
      throw new Error(
        "Completa razón social, RFC, dirección, celular y correo del cliente antes de aceptar.",
      );
    modal(
      "Registrar aceptación del cliente",
      form(
        `<p>Propuesta ${esc(id)} por ${money(q.total)} en productos.</p><label class="check"><input name="accepted" type="checkbox" required>El cliente aceptó productos, aromas, pago, impuestos y condiciones finales de entrega por ${esc(q.channel)}.</label>${field("Referencia de la aceptación", "reference", "", "text", 'required placeholder="Mensaje, folio o referencia del correo"')}`,
        "Confirmar aceptación",
      ),
    );
    bindForm((d) => {
      q.status = "Aceptada";
      q.acceptanceReference = d.get("reference").trim();
      q.acceptedAt = new Date().toISOString();
      audit(state, `Aceptación registrada: ${id}`);
    });
    return;
  }
  if (action === "quote-order") {
    createOrder(state, id, true);
    save();
    location.hash = "/orders";
    render();
    toast("Pedido creado. Espera autorización administrativa.");
    return;
  }
  if (action === "order") {
    const o = state.orders.find((o) => o.id === id),
      index = orderStages.indexOf(o.status);
    modal(
      `${esc(o.id)} · ${esc(cname(o.clientId))}`,
      form(
        `<div class="timeline">${orderStages.map((s, i) => `<span class="${i <= index ? "done" : ""}">${s}</span>`).join("")}</div><p>Total: ${money(o.total)} · Canal: ${esc(o.channel)}</p>${field("Fecha de entrega comprometida", "due", o.due, "date")}${field("Guía de envío", "tracking", o.tracking)}<p>Los avisos generados quedarán pendientes de conexión.</p><div class="actions">${index < orderStages.length - 1 ? btn(`Avanzar a ${orderStages[index + 1]}`, "advance-order", o.id, true) : badge("Entregado", "good")}</div>`,
        "Guardar datos",
      ),
    );
    bindForm((d) => {
      if (!["Dirección", "Administración"].includes(state.role))
        throw new Error("Administración actualiza fecha y guía.");
      o.due = d.get("due");
      o.tracking = d.get("tracking").trim();
      audit(state, `Datos de envío actualizados: ${id}`);
    });
    return;
  }
  if (action === "advance-order") {
    const updatedOrder = advanceOrder(
      state,
      id,
      dialog.querySelector("[name=tracking]").value,
    );
    save();
    if (cloudContext?.role === "production") {
      cloudQueue = cloudQueue
        .then(() => updateProductionOrder(updatedOrder, cloudContext))
        .catch((error) => toast(error.message));
    }
    dialog.close();
    render();
    toast("Etapa actualizada y aviso registrado.");
    return;
  }
  if (action === "sample-new") {
    modal(
      "Solicitar muestra opcional",
      form(
        select(
          "Oportunidad",
          "opportunityId",
          state.opportunities.map((o) => [
            o.id,
            `${cname(o.clientId)} · ${stages[o.stage]}`,
          ]),
        ) + "<p>La solicitud se vincula a una oportunidad existente.</p>",
      ),
    );
    bindForm((d) => requestSample(state, d.get("opportunityId")));
    return;
  }
  if (action === "sample") {
    const s = state.samples.find((s) => s.id === id);
    modal(
      `Muestra ${esc(id)}`,
      form(
        `<p>${esc(cname(s.clientId))} · ${esc(s.status)}</p>${field("Aroma seleccionado", "aroma", s.aroma)}${field("Guía", "tracking", s.tracking)}<label>Resultado de la prueba<textarea name="result">${esc(s.result)}</textarea></label><div class="actions">${s.status !== "Evaluada" ? btn("Avanzar muestra", "advance-sample", id, true) : ""}${btn("Seguir venta directa", "sample-direct", s.opportunityId)}</div>`,
      ),
    );
    bindForm((d) => {
      s.aroma = d.get("aroma").trim();
      s.tracking = d.get("tracking").trim();
      s.result = d.get("result").trim();
      audit(state, `Muestra actualizada: ${id}`);
    });
    return;
  }
  if (action === "advance-sample") {
    advanceSample(
      state,
      id,
      dialog.querySelector("[name=tracking]").value,
      dialog.querySelector("[name=result]").value,
    );
    save();
    dialog.close();
    render();
    return;
  }
  if (action === "sample-direct") {
    directRoute(state, id);
    save();
    dialog.close();
    location.hash = "/pipeline";
    return;
  }
  if (action === "new-appointment") {
    modal(
      "Agendar cita",
      form(
        `<div class="field-grid">${select("Cliente", "clientId", clientOptions(), selectedClient)}${select("Vendedor", "owner", ["Eli", "Vendedor 2"])}${field("Fecha y hora local", "start", "", "datetime-local", "required")}${select(
          "Duración",
          "duration",
          [
            ["30", "30 minutos"],
            ["60", "60 minutos"],
          ],
        )}${select("Tipo", "type", ["Llamada", "Videollamada", "Visita"])}</div><p>Se comprueban conflictos con las citas registradas en este navegador.</p>`,
      ),
    );
    bindForm((d) => book(state, Object.fromEntries(d)));
    return;
  }
  if (action === "cancel-appointment") {
    modal(
      "Cancelar cita",
      form(
        "<p>La cita se eliminará de la agenda de demostración.</p>",
        "Confirmar cancelación",
      ),
    );
    bindForm(() => {
      state.appointments = state.appointments.filter((a) => a.id !== id);
      audit(state, "Cita cancelada");
      if (cloudContext) {
        cloudQueue = cloudQueue
          .then(() => deleteCloudRecord("appointments", id, cloudContext))
          .catch((error) => toast(error.message));
      }
    });
    return;
  }
  if (action === "followup") {
    if (!state.tasks.some((t) => t.clientId === id)) {
      state.tasks.push({
        id: uid("tarea"),
        clientId: id,
        title: "Seguimiento de recompra >30 días",
      });
      audit(state, `Seguimiento preparado: ${cname(id)}`);
    }
    save();
    render();
    toast("Seguimiento guardado. No se envió ningún mensaje.");
    return;
  }
  if (action === "complete-task") {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    audit(state, "Seguimiento completado");
    if (cloudContext) {
      cloudQueue = cloudQueue
        .then(() => deleteCloudRecord("tasks", id, cloudContext))
        .catch((error) => toast(error.message));
    }
    save();
    render();
    return;
  }
  if (action === "discount-policy") {
    if (state.role !== "Dirección")
      throw new Error("Solo dirección define la política de descuentos.");
    modal(
      "Política de descuentos",
      form(
        field(
          "Máximo autorizado (%)",
          "limit",
          state.discountLimit,
          "number",
          'min="0" max="100" step="0.1" required',
        ),
      ),
    );
    bindForm((d) => {
      state.discountLimit = Number(d.get("limit"));
      audit(state, `Descuento máximo: ${state.discountLimit}%`);
    });
    return;
  }
  if (action === "export") {
    download(
      "hotel-expert-demo.json",
      JSON.stringify(state, null, 2),
      "application/json",
    );
    return;
  }
  if (action === "reset") {
    modal(
      "Reiniciar demostración",
      form(
        "<p>Se eliminarán los cambios guardados en este navegador. Puedes exportarlos antes de continuar.</p>",
        "Reiniciar",
      ),
    );
    bindForm(() => {
      state = seed();
      selectedClient = "c1";
    });
    return;
  }
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.addEventListener("hashchange", () => {
  query = "";
  render();
  window.scrollTo(0, 0);
});

async function bootstrapCloud() {
  if (!cloudEnabled) {
    render();
    if (storageWarning) toast(storageWarning);
    return;
  }
  app.innerHTML = `<main class="auth-shell"><section class="auth-card"><p class="eyebrow">Hotel Expert</p><h1>Preparando tu CRM…</h1><p>Estamos cargando clientes, ventas y operación.</p></section></main>`;
  try {
    cloudContext = await getCloudContext();
    if (!cloudContext) {
      renderAuth();
      return;
    }
    const remoteState = await loadCloudState(cloudContext);
    if (!remoteState.initialized) {
      state = seed();
      state.role = cloudContext.roleLabel;
      state.initialized = true;
      await pushCloudState(state, cloudContext);
    } else {
      state = remoteState;
    }
    localStorage.setItem(KEY, JSON.stringify(state));
    render();
  } catch (error) {
    cloudContext = null;
    renderAuth(error.message || "No fue posible cargar el CRM.");
  }
}

onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    cloudContext = null;
    renderAuth();
  }
  if (event === "SIGNED_IN" && !cloudContext) {
    setTimeout(() => bootstrapCloud(), 0);
  }
});

bootstrapCloud();
