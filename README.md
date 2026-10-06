# Hotel Expert · CRM & Operación

CRM de demostración alineado con [Figma](https://www.figma.com/design/Qs3uCDg51cxgPDhVQqajBF/Hotel-Expert?node-id=3-108): venta directa con Sara IA, muestras opcionales, cotizaciones, pedidos y seguimiento.

## Ejecutar

Requiere Node.js 20 o superior. No requiere instalar paquetes.

```sh
npm run dev
```

Abrir `http://127.0.0.1:4173`.

```sh
npm run check
npm test
npm run build
```

El build estático queda en `dist/` y puede alojarse en un servidor estático. Las rutas usan hash y funcionan sin reglas especiales del servidor. Las fuentes Montserrat y Source Sans 3 se cargan desde Google Fonts, con alternativas locales si no hay conexión.

## Qué funciona

Clientes editables, búsqueda global, pipeline con dos rutas, muestras sin duplicados, catálogo de aromas aprobados, cotización con límites de descuento, aceptación y creación de pedido, autorización y etapas operativas, citas sin solapamientos, tareas de recompra, métricas derivadas de datos, registro de eventos y exportación JSON.

Los datos se guardan en el navegador. El selector de perfil simula Dirección, Administración, Ventas y Producción. Desde Equipo y permisos se puede exportar o reiniciar la demostración.

**No es un sistema de producción.** Sara simula respuestas; no hay backend, autenticación, comunicaciones externas ni datos reales conectados. No se envían mensajes, se generan cobros o se ejecutan compras. Consultar [alcance y pendientes de integración](docs/IMPLEMENTACION.md).

El repositorio inicial contenía solo el andamiaje de Figma. La documentación original de su API se conserva bajo `docs/`.
