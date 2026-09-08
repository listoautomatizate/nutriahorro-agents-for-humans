# Guia maestra de entrega de nutrIAhorro

Proyecto para **Agents for Humans Hackathon**, categoria **Everyday Agents**.

## Fecha y requisitos oficiales

- Cierre: **14 de septiembre de 2026 a las 17:00 PDT**, equivalente a las **21:00 de Uruguay**.
- El agente debe estar construido con **Strands Agents SDK** y ejecutar trabajo real de punta a punta.
- AgentCore no es obligatorio, pero fortalece la calificacion tecnica.
- El repositorio debe ser publico, reproducible y tener README y licencia MIT o Apache visible.
- Se exige diagrama de arquitectura.
- El video debe ser publico en YouTube o Vimeo, durar como maximo cinco minutos y mostrar el producto funcionando.
- La entrega exige AWS Builder ID.
- La demo publica es opcional, pero mejora la evaluacion tecnica.
- Los materiales deben estar en ingles o acompañados de traduccion al ingles.

Fuentes oficiales: <https://agentsforhumans.devpost.com/> y <https://agentsforhumans.devpost.com/rules>.

## Historia central

nutrIAhorro no es una copia de una aplicacion de calorias. Es un agente cotidiano que conecta decisiones que normalmente estan separadas:

1. Entiende los objetivos generales de bienestar, el tiempo y las preferencias.
2. Lee un ticket y propone productos editables.
3. Espera confirmacion antes de modificar la despensa.
4. Mantiene lotes, stock y prioridad por vencimiento.
5. Sugiere solamente recetas que se pueden cocinar con las cantidades disponibles.
6. Muestra calorias, proteina, carbohidratos y grasas por receta.
7. Al confirmar una comida, actualiza las cuatro metricas y descuenta los ingredientes en la misma operacion.
8. Compara una canasta demostrativa con distancia y costo de traslado de ida y vuelta.

## Estado tecnico

### Terminado y probado localmente

- Aplicacion web adaptable a computadora y celular.
- Demo publica desplegada y probada en computadora y celular.
- Pantallas Hoy, Objetivos, Despensa, Recetas y Compra.
- Perfil editable con objetivo, actividad, ejercicio, tiempo, preferencias y restricciones.
- Calculo orientativo de calorias y macronutrientes.
- Registro diario completo de calorias, proteina, carbohidratos y grasas.
- Descuento exacto de ingredientes por lotes, consumiendo primero el que vence antes.
- Rechazo de una comida si no existe cantidad suficiente.
- Ticket en dos pasos: lectura y revision humana antes de guardar.
- Agente Strands con seis herramientas y confirmacion de acciones.
- Lectura multimodal de tickets preparada para Amazon Bedrock.
- Manifiesto oficial de AgentCore validado.
- Puente AWS de minimo privilegio preparado.
- D1, R2, modo demostracion, pruebas y documentacion.

### Pendiente de una autorizacion externa de AWS

- Canjear el credito promocional solo si es necesario.
- Esperar que AWS Support retire la restriccion de cuenta que mantiene Nova en `NOT_AUTHORIZED`.
- Repetir una invocacion minima de Bedrock y confirmar acceso al modelo.
- Desplegar AgentCore y el puente AWS.
- Conectar los dos secretos privados del alojamiento web.
- Publicar la version de la demo conectada al agente real.
- Ejecutar y guardar evidencia de las siete pruebas reales.
- Grabar y publicar el video.
- Completar y enviar Devpost.

No se debe afirmar que AgentCore esta activo hasta que las pruebas reales pasen.

## Enlaces de la entrega

- Demo: <https://nutriahorro.elartedeinvertir911.chatgpt.site>
- Codigo: <https://github.com/listoautomatizate/nutriahorro-agents-for-humans>
- Arquitectura: `docs/architecture.svg`
- Texto de Devpost: `docs/devpost-submission.md`
- Guion: `docs/demo-script-es.md`

## Prueba que debe quedar grabada

1. Abrir la web sin iniciar sesion.
2. Editar Objetivos y mostrar el cambio de referencias diarias.
3. Cargar un ticket, corregir un producto y confirmar.
4. Mostrar que el alimento aparece en Despensa y que el ticket por si solo no modifico nada antes de confirmar.
5. Abrir una receta y mostrar las cuatro metricas.
6. Registrar la comida y mostrar, en una sola secuencia, el progreso diario y la cantidad descontada.
7. Preguntar al agente por macros, alimento urgente y receta rapida; mostrar las herramientas consultadas.
8. Comparar caminando y en auto, aclarando que los precios son ficticios.
9. Mostrar brevemente arquitectura, Strands y AgentCore.

## Cuentas y datos que no se publican

- Claves AWS, tarjeta, codigos promocionales y codigos de un solo uso.
- ID de cuenta AWS en capturas o video.
- Correos personales.
- Tickets reales con datos identificables.
- El token privado entre la web y Lambda.

## Control de costos

- No crear recursos hasta tener una razon de prueba concreta.
- Usar `us-east-1` y Amazon Nova Lite.
- Mantener un presupuesto mensual preventivo de USD 5 y revisar cualquier alerta antes de continuar.
- Limitar sesiones y concurrencia, y realizar prompts cortos.
- Recordar que AWS Budgets alerta, pero no garantiza un corte universal.
- No actualizar al Paid Plan. Detener cualquier despliegue que pueda superar los creditos disponibles.

## Entrega final

La entrega en Devpost solo se envia despues de verificar en una ventana privada que funcionan la demo, GitHub, el video y el diagrama. El envio definitivo requiere revision y confirmacion expresa de Lia.
