# Division del trabajo

## Lia: experiencia, automatizacion y demostracion

- Validar el texto y la personalidad de nutrIAhorro.
- Importar y probar los dos flujos de n8n.
- Configurar YCloud dentro de n8n sin compartir la clave.
- Confirmar el numero emisor y el numero de prueba.
- Sustituir precios ficticios por capturas o catalogos vigentes cuando esten disponibles.
- Probar el recorrido completo como usuaria.
- Grabar voz y pantalla para el video final.

## Hermano: AWS y agente

- Crear o revisar la cuenta AWS y el Builder ID.
- Solicitar los creditos promocionales.
- Instalar dependencias de `agent/requirements.txt`.
- Activar acceso a Bedrock en `us-east-1`.
- Ejecutar el agente y validar `/health`, `/chat` y `/summary`.
- Desplegar el servicio en AgentCore o una alternativa AWS.
- Entregar a Lia solamente la URL segura del agente.

## Integracion de ambas partes

1. El hermano publica el agente y obtiene su URL HTTPS.
2. Lia agrega esa URL como `NUTRIAHORRO_AGENT_URL` en el alojamiento web.
3. n8n consulta `/summary` para preparar el mensaje diario.
4. YCloud entrega el mensaje al WhatsApp de prueba.
5. Ambos ejecutan el guion de demostracion completo y corrigen cualquier dato ficticio no rotulado.

La interfaz, la base de datos y los flujos pueden probarse antes de que AWS este listo. Esa separacion permite que ambos trabajen en paralelo.
