# Entrega completa de nutrIAhorro

Guia maestra actualizada para presentar nutrIAhorro en **Agents for Humans
Hackathon**, categoria **Everyday Agents**. El proyecto queda enfocado en la
aplicacion web y el agente Strands/AWS.

## 1. Requisitos oficiales

- Cierre: **14 de septiembre de 2026, 17:00 PDT**. En Uruguay corresponde al
  **14 de septiembre de 2026, 21:00**.
- El proyecto debe usar **Strands Agents SDK** y hacer trabajo real de principio
  a fin.
- AgentCore no es obligatorio, pero mejora la evidencia tecnica.
- El repositorio debe ser publico e incluir codigo, recursos, instrucciones,
  README y licencia MIT o Apache visible.
- La entrega necesita un diagrama de arquitectura.
- El video debe durar como maximo 5 minutos, mostrar el producto funcionando y
  estar publico en YouTube o Vimeo.
- Se debe informar un AWS Builder ID.
- La demo web publica es opcional, pero mejora la evaluacion tecnica.

Enlaces oficiales:

- Hackathon: <https://agentsforhumans.devpost.com/>
- Reglas: <https://agentsforhumans.devpost.com/rules>
- Creditos AWS: <https://forms.gle/6sjzKiX6bKUMA5NEA>
- AgentCore: <https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html>

## 2. Que es nutrIAhorro

nutrIAhorro es un agente cotidiano que combina objetivos personales, despensa,
vencimientos, recetas, ubicacion, transporte y precios para ayudar a la persona
a decidir que comer, que usar primero y donde conviene comprar.

El recorrido principal es:

1. La persona carga sus objetivos, actividad, ejercicio y preferencias.
2. La aplicacion calcula una referencia general de calorias y macronutrientes.
3. La persona carga un ticket o agrega alimentos manualmente.
4. La despensa mantiene stock, antiguedad y prioridad de consumo.
5. El agente propone comidas posibles con el tiempo y los ingredientes reales.
6. La persona confirma una comida y se descuentan los ingredientes.
7. El agente compara supermercados cercanos incluyendo el costo del traslado.

## 3. Estado actual

### Ya esta listo

- Aplicacion web funcional para computadora y celular.
- Secciones Hoy, Objetivos, Despensa, Recetas y Compra.
- Perfil editable con meta, peso, altura, actividad, ejercicio, tiempo,
  preferencias, alergias y alimentos rechazados.
- Calculo orientativo de calorias y macronutrientes.
- Despensa persistente, prioridades de vencimiento y stock bajo.
- Carga de tickets y alta manual de alimentos.
- Recetas con descuento de ingredientes despues de confirmar.
- Comparacion demostrativa por precio, distancia y transporte.
- Asistente integrado en la web.
- Agente Python creado con Strands Agents SDK y cinco herramientas de dominio.
- API del agente con `/health` y `/chat`.
- README, licencia MIT, arquitectura, privacidad, guion y texto para Devpost.
- Pruebas automaticas y compilacion reproducible.

### Falta para entregar

- Hacer publica la web para que los jueces puedan abrirla sin la cuenta de Lia.
- Crear el repositorio publico de GitHub.
- Mostrar la licencia MIT en la seccion About de GitHub.
- Ejecutar el agente con una cuenta AWS real.
- Desplegar preferentemente en AgentCore y conectar la URL a la web.
- Probar el recorrido completo con el agente Strands real.
- Grabar y publicar el video final.
- Completar y enviar el proyecto en Devpost.

## 4. Que recibira el jurado

La presentacion se hace en Devpost. Los jueces abriran:

1. **Repositorio publico:** obligatorio.
2. **Video publico:** obligatorio, maximo 5 minutos.
3. **Demo web publica:** opcional, pero muy recomendable.
4. **Diagrama de arquitectura:** obligatorio.
5. **Texto del proyecto y AWS Builder ID:** obligatorios.

Ningun enlace debe exigir la cuenta personal de Lia ni contrasenas privadas.

## 5. Trabajo de Lia

Lia delega el trabajo tecnico pendiente en su hermano. Su parte queda reducida a:

1. Autorizar expresamente que la web sea publica.
2. Entregar el usuario de GitHub donde se publicara el repositorio.
3. Confirmar el nombre y usuario de Devpost de su hermano.
4. Validar los datos ficticios, el tono y la experiencia del producto.
5. Probar la aplicacion como usuaria y comunicar errores.
6. Grabar voz, pantalla o presentacion si acuerdan que ella haga el pitch.
7. Revisar la entrega de Devpost antes del envio definitivo.

## 6. Todo lo que debe hacer el hermano

### GitHub y publicacion

1. Crear el repositorio publico `nutriahorro-agents-for-humans`.
2. Subir el contenido completo del proyecto.
3. Configurar en About:
   - Description: `Everyday Strands agent for pantry, nutrition and smart grocery decisions.`
   - Website: enlace publico de nutrIAhorro.
   - Topics: `strands-agents`, `amazon-bedrock`, `agentcore`, `nutrition`,
     `food-waste`, `smart-shopping`, `uruguay`.
   - License: debe aparecer `MIT`.
4. Comprobar que no haya `.env`, claves AWS, datos personales ni tickets reales.

### AWS y Strands

1. Tener cuenta AWS activa con facturacion y alarma de presupuesto.
2. Crear o confirmar el AWS Builder ID.
3. Confirmar la solicitud de USD 50 antes del 11 de septiembre, 12:00 PT.
4. Clonar el repositorio y entrar a `agent`.
5. Crear el entorno Python e instalar `requirements.txt`.
6. Configurar credenciales AWS localmente o mediante un rol IAM.
7. Confirmar acceso a Amazon Bedrock y al modelo configurado.
8. Ejecutar y probar `/health` y `/chat`.
9. Probar las cinco herramientas: perfil, despensa, recetas, compra y registro de
   comida con confirmacion.

Prueba local:

```bash
cd agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn api:app --reload --port 8000
```

### AgentCore e integracion web

1. Seguir la guia oficial de Amazon Bedrock AgentCore.
2. Adaptar el agente al contrato de Runtime si es necesario.
3. Desplegar e invocar el agente.
4. Guardar capturas de la ejecucion y las trazas.
5. Conectar el agente a la web mediante `NUTRIAHORRO_AGENT_URL`.
6. Verificar que una consulta de la web llegue realmente a Strands + Bedrock.
7. Probar la web publica en computadora y celular.

Si AgentCore no llega a tiempo, debe mostrar Strands con Bedrock funcionando
localmente y explicarlo con honestidad. No se debe afirmar que AgentCore esta
activo si no fue desplegado y probado.

### Video y Devpost

1. Grabar el video siguiendo `docs/demo-script-es.md`.
2. Mostrar objetivos, ticket, despensa, receta, descuento de stock, compra
   contextual, agente Strands y arquitectura.
3. Mantener la duracion entre 4:20 y 4:50.
4. Subir el video como publico a YouTube o Vimeo.
5. Probar web, GitHub y video en una ventana privada.
6. Copiar el texto de `docs/devpost-submission.md`.
7. Adjuntar el diagrama de `docs/architecture.md` como imagen legible.
8. Agregar a Lia y a su hermano como integrantes del proyecto.
9. Completar AWS Builder ID y todos los enlaces.
10. Pedir a Lia la revision y autorizacion final antes de enviar.

## 7. Estructura del repositorio

- `app/`, `components/`, `lib/`, `db/`: producto web y memoria.
- `agent/`: agente Strands, herramientas, API y pruebas.
- `drizzle/`: estructura de la base de datos.
- `docs/`: arquitectura, AWS, seguridad, video y entrega.
- `public/`: identidad visual.
- `README.md`: explicacion e instrucciones.
- `LICENSE`: licencia MIT.

## 8. Evidencia que conviene guardar

- Web publica abierta sin iniciar sesion.
- GitHub publico con licencia MIT visible.
- Resultado de las pruebas de web y agente.
- Invocacion real de Bedrock o AgentCore.
- Consulta web respondida por el agente Strands real.
- Diagrama de arquitectura.
- Video publico.
- Confirmacion final de Devpost.

## 9. Lo que Codex necesita de Lia

Para terminar la publicacion:

1. Autorizacion expresa para hacer publica la web.
2. Usuario de GitHub donde se creara el repositorio.
3. Nombre y usuario de Devpost de su hermano.
4. Confirmacion de si ya se envio el formulario de creditos AWS.
5. Confirmacion de si el video se publicara en YouTube o Vimeo.

Las claves AWS se cargan directamente en AWS o en el entorno del servicio. No se
envian por chat ni se guardan en GitHub.

## 10. Regla de honestidad

La entrega debe describir como funcionando solo aquello que haya sido probado.
La web ya funciona. Los precios y el ticket siguen siendo datos ficticios
rotulados. AWS y AgentCore se mencionan como activos solamente despues de la
prueba real.
