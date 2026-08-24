# n8n + YCloud

Los tres flujos se importan desde `Workflows > Import from file` en n8n.

## Credencial

Crear una credencial `Header Auth` y seleccionarla en cada nodo `Enviar por YCloud`:

- Nombre: `YCloud API Key`
- Header: `X-API-Key`
- Valor: la API Key creada en YCloud

Nunca pegar la clave dentro del JSON del flujo.

## Flujos

- `nutriahorro-daily-summary.json`: recibe el resumen diario del agente y lo envia por WhatsApp.
- `nutriahorro-scheduled-summary.json`: consulta el resumen cada dia a las 8:00 de Maldonado y lo prepara para WhatsApp.
- `nutriahorro-inbound-whatsapp.json`: recibe textos, ubicaciones y fotos de tickets desde el webhook de YCloud y responde dentro de la ventana de atencion.

Los nodos de envio se importan desactivados para evitar mensajes accidentales. Antes de activarlos:

1. Reemplazar `REPLACE_BUSINESS_PHONE` y `REPLACE_USER_PHONE` por numeros en formato internacional E.164.
2. Reemplazar `REPLACE_PUBLIC_APP_URL` por la URL publicada de nutrIAhorro.
3. Seleccionar la credencial de YCloud.
4. Enviar primero un WhatsApp del usuario al numero Business.
5. Probar durante la ventana de atencion de 24 horas.
6. Para resumenes iniciados por el sistema fuera de esa ventana, crear una plantilla `utility` aprobada y sustituir el envio de texto libre.

Documentacion oficial:

- https://docs.ycloud.com/reference/whatsapp_message-send-directly
- https://docs.ycloud.com/reference/whatsapp-inbound-message-webhook-examples
- https://docs.ycloud.com/reference/configure-webhooks
