# Narracion final y plan de tomas, duracion objetivo: 4 minutos 35 segundos

## 0:00 a 0:28 - Una decision, no otro tablero

"A las seis de la tarde, la pregunta casi nunca es solamente que deberia comer. Es: que tengo en casa, que se vence primero, que encaja con mis objetivos, cuanto tiempo tengo y si esa oferta sigue siendo barata despues del traslado. nutrIAhorro convierte toda esa decision en una respuesta practica."

Mostrar Hoy: prioridades, las cuatro metricas nutricionales y el ahorro contextual. Restablecer antes la demo ficticia.

## 0:28 a 0:58 - Construido alrededor de una persona real

"Este agente cotidiano empieza por el contexto, no por suposiciones. La persona elige un objetivo general de bienestar, actividad, ejercicio, tiempo para cocinar, preferencias y transporte. nutrIAhorro convierte esas elecciones en referencias editables de calorias, proteina, carbohidratos y grasas. Son orientativas; nunca diagnostico ni tratamiento medico."

Abrir Objetivos y mostrar los campos relevantes y las cuatro referencias calculadas.

## 0:58 a 1:42 - Del ticket a una memoria confiable

"Una foto del ticket se transforma en productos estructurados, pero el agente nunca modifica la despensa en silencio. Puedo corregir una cantidad, eliminar un error y confirmar la compra. Recién entonces pasa a ser memoria persistente. Los lotes separados conservan el orden de compra, para señalar poco stock y priorizar primero los alimentos seguros mas antiguos."

Subir el ticket ficticio, editar un producto, confirmar y abrir Despensa. Mostrar pollo, tomate y palta como prioridades.

"Toda esta demostracion usa contenido de ticket y precios ficticios."

## 1:42 a 2:37 - Una accion confirmada, todo sincronizado

"Ahora el agente combina las cantidades disponibles con el tiempo y el objetivo de la persona. Una sugerencia util tiene que poder cocinarse de verdad. Cada receta muestra calorias, proteina, carbohidratos y grasas; no un solo macro aislado."

Abrir Recetas, elegir el filtro rapido y mostrar las cuatro metricas.

"Cuando confirmo que cocine, una sola operacion registra las cuatro metricas y descuenta las cantidades exactas de los lotes mas antiguos. Si no hay stock suficiente, la accion se rechaza. Aca el progreso diario y la despensa se actualizan juntos."

Confirmar la comida, mostrar Hoy y volver a Despensa para comprobar el descuento.

## 2:37 a 3:12 - El costo real de una oferta

"Una compra inteligente tambien necesita contexto. nutrIAhorro compara canastas cercanas y suma el costo de ida y vuelta para caminar, bicicleta, auto o moto. El precio mas bajo en la gondola no es automaticamente la mejor decision. Aca gana la opcion cercana con menor costo efectivo. Son precios rotulados de demostracion, no promociones en vivo."

Abrir Compras y alternar transportes para que cambie el costo efectivo.

## 3:12 a 4:14 - El ciclo de decision Strands

Preguntar: "Que deberia usar primero, que puedo cocinar en veinte minutos y donde conviene comprar?"

"Aca el producto se convierte en agente. La capa de decision esta construida con Strands Agents SDK. Para una sola consulta, Strands selecciona las herramientas de despensa, recetas y compra, las ejecuta sobre la memoria estructurada actual y une los resultados en una respuesta."

Mostrar la traza visible `strands-demo` y las tres herramientas elegidas.

"El mismo agente expone seis herramientas: perfil, despensa, progreso diario, sugerencias, comparacion de compras y registro confirmado de comidas. Esta verificacion usa nuestro modelo demostrativo determinista, rotulado expresamente, para que el ciclo real de Strands sea reproducible sin costo externo. La capa de proveedores tambien admite Amazon Bedrock para un despliegue con IA. La confirmacion humana sigue siendo el limite antes de cambiar la despensa."

Mostrar brevemente arquitectura y las seis herramientas en el repositorio publico.

## 4:14 a 4:35 - Por que importa

"nutrIAhorro es para personas y hogares con poco tiempo que quieren comer con mas conciencia sin convertir su dia en una planilla. Les ayuda a desperdiciar menos, cuidar su presupuesto y tomar una mejor decision por vez. Eso es un agente para humanos: contexto util, accion real y el control siempre en manos de la persona."

Cerrar con la demo publica, GitHub y la categoria Everyday Agents.
