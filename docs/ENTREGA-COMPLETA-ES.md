# Entrega completa de nutrIAhorro

Esta es la guia maestra para que Lia y su hermano lleven nutrIAhorro desde el
MVP actual hasta una entrega valida y demostrable en **Agents for Humans
Hackathon**, dentro de la categoria **Everyday Agents**.

## 1. Fecha y requisitos oficiales

- Cierre: **14 de septiembre de 2026, 17:00 PDT**. En Uruguay corresponde a
  **14 de septiembre de 2026, 21:00**.
- El proyecto debe ser nuevo y usar **Strands Agents SDK** para hacer trabajo
  real de principio a fin.
- AgentCore no es obligatorio, pero suma evidencia tecnica.
- El repositorio debe ser publico y contener codigo, recursos, instrucciones,
  README y licencia MIT o Apache visible.
- Se debe incluir un diagrama de arquitectura.
- El video debe durar como maximo 5 minutos, estar publico en YouTube o Vimeo y
  mostrar el producto funcionando, el problema, para quien es y por que importa.
- Se debe informar un AWS Builder ID.
- El enlace de demostracion en vivo es opcional, pero mejora la evaluacion
  tecnica.

Enlaces oficiales:

- Hackathon: <https://agentsforhumans.devpost.com/>
- Reglas: <https://agentsforhumans.devpost.com/rules>
- Creditos AWS: <https://forms.gle/6sjzKiX6bKUMA5NEA>
- AgentCore: <https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html>

## 2. Estado real del proyecto

### Ya esta listo

- Aplicacion web funcional para computadora y celular.
- Secciones Hoy, Objetivos, Despensa, Recetas y Compra inteligente.
- Perfil editable con meta, peso, altura, actividad, ejercicio, tiempo,
  preferencias, alergias y alimentos rechazados.
- Calculo orientativo de calorias y macronutrientes.
- Despensa persistente, prioridades de vencimiento y stock bajo.
- Recetas con descuento de ingredientes despues de confirmar.
- Comparacion demostrativa de supermercados por precio, distancia y transporte.
- Carga de tickets y resumen diario.
- Agente Python creado con Strands Agents SDK y seis herramientas de dominio.
- API del agente con `/health`, `/chat` y `/summary`.
- Tres automatizaciones importables para n8n y YCloud.
- README, licencia MIT, arquitectura, privacidad, texto de Devpost y guion.
- Pruebas automaticas del agente y comprobaciones de calidad de la web.

### Todavia no esta terminado para los jueces

- La web publicada esta en modo privado. Hay que autorizar su publicacion para
  que cualquier juez con el enlace pueda abrirla.
- Falta crear el repositorio publico de GitHub y poner la licencia MIT en la
  seccion About de GitHub.
- Falta ejecutar el agente con una cuenta AWS real y, preferentemente,
  desplegarlo en AgentCore.
- Falta conectar la URL del agente desplegado a la web.
- Falta configurar las credenciales reales de YCloud dentro de n8n, probar y
  activar los envios.
- Falta grabar y publicar el video final.
- Falta completar y enviar la pagina final del proyecto en Devpost.

## 3. Que ve el jurado

La entrega se hace en Devpost. Los jueces reciben los enlaces que se carguen en
la presentacion y revisan el proyecto durante el periodo de evaluacion. No deben
necesitar la cuenta personal de Lia ni contrasenas privadas.

Los tres enlaces importantes son:

1. **Repositorio publico:** obligatorio. Permite revisar y ejecutar el codigo.
2. **Video publico:** obligatorio. Es la demostracion principal, maximo 5 minutos.
3. **Demo web publica:** opcional, pero muy recomendable para que prueben el MVP.

## 4. Trabajo de Lia

### Publicacion y Devpost

1. Autorizar que la web pase de privada a publica.
2. Confirmar el usuario de GitHub y crear el repositorio publico
   `nutriahorro-agents-for-humans`.
3. En GitHub, completar la seccion About:
   - Description: `Everyday Strands agent for pantry, nutrition and smart grocery decisions.`
   - Website: enlace publico de nutrIAhorro.
   - Topics: `strands-agents`, `amazon-bedrock`, `agentcore`, `n8n`, `whatsapp`,
     `nutrition`, `food-waste`, `uruguay`.
   - License: debe aparecer `MIT`.
4. Crear el proyecto final en Devpost y agregar a su hermano como integrante.
5. Copiar el texto preparado en `docs/devpost-submission.md`.
6. Adjuntar el diagrama de `docs/architecture.md` como imagen o captura legible.
7. Agregar los enlaces publicos de GitHub, video y demo.
8. Informar el AWS Builder ID del representante que presenta.
9. Enviar antes del cierre y volver a abrir la pagina publica para comprobarla.

### Video

1. Grabar pantalla horizontal en 1080p.
2. Seguir `docs/demo-script-es.md` y mantener la duracion entre 4:20 y 4:50.
3. Mostrar un recorrido real: objetivos, ticket, despensa, receta, descuento de
   stock, compra contextual, agente Strands y WhatsApp.
4. Mostrar por unos segundos el diagrama y el repositorio publico.
5. Aclarar que precios y ticket son datos ficticios de demostracion.
6. Subir a YouTube o Vimeo como **publico**, no privado ni solo para invitados.
7. Probar el enlace en una ventana privada antes de cargarlo en Devpost.

### n8n y WhatsApp

La aplicacion funciona sin n8n. n8n es la capa que hace que el agente trabaje en
segundo plano y entregue decisiones por WhatsApp.

1. Importar los tres archivos de `integrations/n8n`.
2. Crear en n8n una credencial `Header Auth` con nombre `YCloud API Key`, header
   `X-API-Key` y la clave guardada solamente en n8n.
3. Reemplazar los marcadores:
   - `REPLACE_PUBLIC_APP_URL`: URL publica de nutrIAhorro.
   - `REPLACE_BUSINESS_PHONE`: numero de WhatsApp Business en formato E.164.
   - `REPLACE_USER_PHONE`: numero de prueba en formato E.164.
4. Seleccionar la credencial YCloud en cada nodo `Enviar por YCloud`.
5. Copiar el webhook de produccion del flujo entrante y configurarlo en YCloud.
6. Enviar primero un WhatsApp al numero Business y probar la respuesta dentro de
   la ventana de 24 horas.
7. Probar `/api/summary` desde el flujo de resumen programado.
8. Para mensajes iniciados por el sistema fuera de la ventana de 24 horas, usar
   una plantilla `utility` aprobada por WhatsApp.
9. Activar los nodos de envio solamente cuando los telefonos y el contenido
   hayan sido revisados.
10. Grabar evidencia del flujo ejecutado y del mensaje recibido.

No enviar claves, contrasenas ni tokens por chat ni guardarlos en GitHub.

## 5. Trabajo del hermano

### Cuenta y preparacion AWS

1. Tener cuenta AWS activa con facturacion y alarma de presupuesto.
2. Crear o confirmar el AWS Builder ID.
3. Confirmar si ya se envio el formulario de USD 50 antes del 11 de septiembre,
   12:00 PT. Los gastos que superen el credito son responsabilidad del equipo.
4. Clonar el repositorio publico y entrar a la carpeta `agent`.
5. Crear el entorno Python e instalar `requirements.txt`.
6. Configurar credenciales AWS localmente o mediante un rol IAM. Nunca escribir
   claves en archivos que se suban a GitHub.
7. Confirmar acceso a Amazon Bedrock y al modelo configurado.

### Prueba local obligatoria

```bash
cd agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn api:app --reload --port 8000
```

Comprobar:

- `GET http://localhost:8000/health`
- `POST http://localhost:8000/chat`
- `GET http://localhost:8000/summary`
- Las herramientas de perfil, despensa, recetas, compra y confirmacion.

### Despliegue recomendado

1. Seguir el inicio oficial de Amazon Bedrock AgentCore.
2. Adaptar el agente al contrato de Runtime si el asistente de AgentCore lo pide.
3. Desplegar, invocar el agente y conservar capturas de la ejecucion y trazas.
4. Entregar a Lia una URL HTTPS o el mecanismo seguro de invocacion, nunca las
   credenciales.
5. Conectar esa direccion a la web como `NUTRIAHORRO_AGENT_URL`.
6. Verificar que la pregunta del asistente web llega al agente Strands real y
   que `/summary` puede usarlo.

Si AgentCore no llega a tiempo, el minimo honesto es mostrar el agente Strands
ejecutandose localmente con Bedrock durante el video. No se debe afirmar que esta
en AgentCore si no fue desplegado alli.

## 6. Integracion final de ambos trabajos

1. El hermano prueba Strands + Bedrock y publica el agente.
2. Lia conecta `NUTRIAHORRO_AGENT_URL` en el alojamiento de la web.
3. Ambos prueban en la web una consulta que requiera herramientas.
4. Lia importa y configura n8n con la URL publica.
5. Ambos prueban el resumen diario en WhatsApp.
6. Ejecutan el guion completo sin cortes importantes.
7. Graban el video definitivo y lo publican.
8. Revisan todos los enlaces en una ventana privada.
9. Lia completa Devpost y su hermano confirma que figura en el equipo.

## 7. Repositorio que recibira el jurado

La raiz ya esta preparada y contiene:

- `app/`, `components/`, `lib/`, `db/`: producto web y memoria.
- `agent/`: agente Strands, herramientas, API y pruebas.
- `integrations/n8n/`: tres automatizaciones importables.
- `drizzle/`: estructura de la base de datos.
- `docs/`: arquitectura, instalacion, seguridad, video y entrega.
- `public/`: identidad visual.
- `README.md`: explicacion e instrucciones.
- `LICENSE`: licencia MIT.

Antes de publicar hay que ejecutar una revision final de secretos. El
repositorio no debe contener `.env`, claves AWS, clave YCloud, telefonos
personales ni tickets reales.

## 8. Evidencia que conviene guardar

- Captura de la web publica abierta sin iniciar sesion.
- Captura del repositorio publico y su licencia MIT visible.
- Resultado de las pruebas del agente y de la web.
- Captura de la invocacion real de Bedrock o AgentCore.
- Captura de una ejecucion exitosa de n8n.
- Captura del WhatsApp recibido.
- Enlace publico del video.
- Confirmacion final de Devpost.

## 9. Lo que Codex necesita de Lia

Para terminar la publicacion y no solo dejarla preparada, Lia debe confirmar:

1. Autorizacion expresa para hacer publica la web.
2. Usuario de GitHub donde se creara el repositorio publico.
3. Nombre y usuario de Devpost de su hermano.
4. Si el formulario de creditos AWS ya fue enviado.
5. Si el video se publicara en YouTube o Vimeo.

Las claves de AWS y YCloud se cargan directamente en sus respectivas cuentas.
No se comparten con Codex por chat.

## 10. Regla de honestidad para la entrega

La entrega debe describir como funcionando solo aquello que se haya probado. El
MVP web ya funciona. Los precios actuales son ficticios y estan rotulados. AWS,
AgentCore y WhatsApp deben mostrarse como integraciones activas unicamente
despues de completar sus pruebas reales.
