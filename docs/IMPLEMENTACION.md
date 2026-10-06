# Hotel Expert CRM con Sara IA

La aplicación implementa una demostración funcional del diseño de Figma. El repositorio original tenía `src/.gitkeep` y documentación de la API de Figma, pero no contenía una aplicación ni servicios de negocio. Los módulos nuevos no sustituyen un backend existente.

## Requisitos incorporados

- Venta directa con Sara como ruta preferente. La muestra y la llamada son opcionales.
- Muestras vinculadas a la oportunidad, con seguimiento y resultado. Se puede continuar la compra sin esperar la prueba.
- Dashboard de pedidos, facturación registrada, nuevos clientes, prospectos y recompra.
- Expediente: nombre comercial, razón social, RFC, envío, contacto, celular, correo, puesto y preferencias.
- Catálogo de productos y registro explícito de aromas aprobados, con compatibilidad por producto.
- Cotizaciones con cantidades, aromas, condiciones, vigencia, descuento limitado por dirección y aceptación documentada.
- Pedido confirmado, autorización administrativa, producción, empaque, guía y entrega.
- Citas sin solapamientos por vendedor, tareas de recompra y reportes semanales/mensuales.
- Registro local de avisos operativos e historial de acciones.
- Navegación responsive, búsqueda global, estados vacíos y errores visibles.

## Fuente y decisiones

Fuente primaria: documento del cliente «para CRM interno.docx», recuperado de la conversación «Subir CRM a GitHub». Se aplicó la aclaración posterior del usuario: Sara busca cerrar directamente, con muestra opcional.

El documento no proporciona catálogo de aromas, fichas técnicas, precios reales, cobertura, política de descuentos, horarios laborales ni definición completa de estados. Los productos y precios de demostración conservan las referencias que ya tenía Figma. Los aromas empiezan vacíos y el descuento permitido en cero hasta registrar una política. Los estados operativos conservan la autorización administrativa del diseño existente. Eli aparece en Figma como una vendedora humana; ese nombre se conserva. La IA se identifica como Sara IA.

## Alcance técnico

Aplicación estática de JavaScript y CSS, sin dependencias de ejecución, con almacenamiento en `localStorage`. `src/domain.js` separa las reglas del renderizado. `src/data.js` contiene datos ficticios. `src/styles.css` reproduce la paleta, tipografía, espacios y componentes del archivo de Figma.

Los controles por perfil son una simulación de UX, no autenticación ni autorización segura. El selector de perfil permite revisar cada rol. No utilizar con datos personales reales ni para operar pedidos reales.

Sara utiliza respuestas deterministas de demostración. No hay modelo de IA conectado. No hay envío de WhatsApp, Instagram, Facebook, correo, cobro, facturación fiscal, lectura bancaria, inventario real ni calendario externo. Los avisos permanecen como «Pendiente de integración». La importación de datos y la sincronización entre equipos tampoco están implementadas.

## Para activar operación real

1. Definir backend, almacenamiento, autenticación y autorización por cartera en servidor.
2. Importar productos, aromas, fichas técnicas, precios, impuestos, cobertura y límites aprobados.
3. Conectar canales y agenda con credenciales del titular; añadir consentimiento y políticas de comunicación.
4. Implementar Sara sobre herramientas de negocio autorizadas, con confirmación del cliente, transferencia humana y auditoría.
5. Persistir cotizaciones, pedidos y eventos en transacciones; idempotencia de avisos y reintentos en servidor.
6. Integrar inventario, producción, facturación y seguimiento logístico; verificar consistencia y permisos con datos de prueba.

## Correspondencia de pantallas

El archivo `docs/figma-snapshot.json` registra textos y nodos del diseño actualizado. `docs/figma-map.json` vincula cada pantalla con la ruta de la aplicación. Los detalles de cliente, oportunidad, pedido y muestra se abren en vistas o diálogos para reducir pasos. Las pantallas que dependen de servicios externos muestran su estado pendiente.
