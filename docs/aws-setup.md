# Activacion de AWS y Strands

## Lo que se necesita

1. Una cuenta AWS con facturacion habilitada.
2. Un AWS Builder ID para la entrega de Devpost.
3. Acceso a Amazon Bedrock en `us-east-1`.
4. Python 3.11 o posterior.
5. Los USD 50 de credito promocional, si todavia hay disponibilidad.

Formulario oficial de creditos: <https://forms.gle/6sjzKiX6bKUMA5NEA>

Fecha limite informada por la organizacion: **11 de septiembre de 2026 a las 12:00 PT**, sujeto a disponibilidad. Los creditos vencen el 31 de octubre de 2026.

## Configuracion recomendada

El agente usa por defecto `us.amazon.nova-lite-v1:0`, un modelo multimodal de Amazon Bedrock adecuado para mantener bajo el costo de la demostracion.

Variables disponibles en `agent/.env.example`:

```text
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.amazon.nova-lite-v1:0
```

La identidad que ejecute el agente necesita permiso para invocar modelos de Bedrock. En una demostracion local pueden usarse las credenciales configuradas con AWS CLI. En un despliegue conviene utilizar un rol IAM con el menor alcance posible.

## Credenciales

- No pegar claves AWS, YCloud ni telefonos privados en el repositorio.
- No enviarlas por chat.
- Configurarlas dentro de AWS, el entorno del servicio y el gestor de credenciales de n8n.
- Crear una alarma de presupuesto antes de activar la demostracion.

## AgentCore

AgentCore es opcional para participar. Si el tiempo alcanza, desplegar el agente alli mejora la evidencia tecnica y permite conectar la web mediante `NUTRIAHORRO_AGENT_URL`. El MVP y su modo de demostracion funcionan aunque AgentCore aun no este activo.
