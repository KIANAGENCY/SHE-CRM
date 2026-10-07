# Hotel Expert · CRM & Operación

CRM alineado con [Figma](https://www.figma.com/design/Qs3uCDg51cxgPDhVQqajBF/Hotel-Expert?node-id=3-108): venta directa con Sara IA, muestras opcionales, cotizaciones, pedidos y seguimiento. Puede trabajar como demostración local o conectado a Supabase con cuentas, espacios de trabajo y permisos reales.

## Ejecutar

Requiere Node.js 20.19 o superior.

```sh
npm install
npm run dev
```

Abrir `http://127.0.0.1:5173`.

```sh
npm run check
npm test
npm run build
```

El build de Vite queda en `dist/` y puede desplegarse en Vercel. Las rutas usan hash y funcionan sin reglas especiales del servidor.

## Supabase

1. Crear un proyecto y aplicar `supabase/migrations/20261006040734_hotel_expert_crm.sql`.
2. Copiar `.env.example` a `.env.local`.
3. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con la URL y la clave publicable del proyecto.

La aplicación usa únicamente la clave publicable en el navegador. Las tablas tienen Row Level Security, permisos explícitos y aislamiento por espacio de trabajo. Al crear la primera cuenta también se crean su perfil, su espacio y la membresía de Dirección.

## Qué funciona

Clientes editables, búsqueda global, pipeline con dos rutas, muestras sin duplicados, catálogo de aromas aprobados, cotización con límites de descuento, aceptación y creación de pedido, autorización y etapas operativas, citas sin solapamientos, tareas de recompra, métricas derivadas de datos, registro de eventos y exportación JSON.

Sin variables de Supabase, los datos se guardan en el navegador y el selector de perfil simula Dirección, Administración, Ventas y Producción. Con Supabase configurado, el acceso usa correo y contraseña y los cambios se sincronizan según el perfil asignado.

Sara todavía simula respuestas y no hay comunicaciones externas, cobros, facturación fiscal ni inventario real conectados. Consultar [alcance y pendientes de integración](docs/IMPLEMENTACION.md).

## Puente de WhatsApp

`POST /api/whatsapp-relay` recibe una copia del evento que ya procesa
`https://www.hotelexpert.mx/whatsapp-webhook.php` y la reenvía al webhook de
n8n. El archivo PHP existente debe conservar su respuesta y enviar la copia con
el encabezado `x-she-relay-secret`.

Configurar en Vercel, como secretos de producción:

- `N8N_WHATSAPP_WEBHOOK_URL`
- `WHATSAPP_RELAY_SECRET`

`GET /api/whatsapp-relay` es una comprobación de estado y no revela la
configuración.

El repositorio inicial contenía solo el andamiaje de Figma. La documentación original de su API se conserva bajo `docs/`.
