# nutrIAhorro

**Tu agente cotidiano para comer mejor, aprovechar lo que ya tenes y comprar sin gastar de mas.**

nutrIAhorro convierte tickets y movimientos de despensa en decisiones concretas. Mantiene memoria de los alimentos, prioriza lo que vence, propone comidas compatibles con el tiempo y las preferencias de la persona, y compara canastas cercanas incluyendo el costo del traslado.

Proyecto creado para **Agents for Humans Hackathon**, categoria **Everyday Agents**.

## Demostracion incluida

El repositorio ya trae un caso reproducible situado en Maldonado, Uruguay:

- Perfil general de bienestar de Lia: 177 cm, 66 kg, objetivo 60 kg.
- Pantalla de objetivos editable con meta, movilidad, ejercicio, tiempo para cocinar y preferencias.
- Rango orientativo de 1500 a 1600 kcal y macros cargados por la usuaria.
- Compra ficticia en Ta-Ta: pollo, arroz, 12 huevos, tres paltas, tomate y aceite de oliva.
- Cinco recetas, control de stock y vencimientos, descuento de ingredientes al cocinar.
- Comparacion demostrativa entre El Dorado, Ta-Ta, Disco y Tienda Inglesa.
- Traslados caminando, en bicicleta, auto o moto.
- Asistente integrado para consultar la despensa, las recetas y la compra conveniente.

Los precios son datos ficticios de demostracion, no ofertas vigentes. Las sugerencias nutricionales son generales y no reemplazan diagnostico, tratamiento ni asesoramiento profesional.

## Arquitectura

- **Producto web:** React 19, vinext y Cloudflare Workers.
- **Memoria:** D1 para objetivos, perfil, despensa, recetas, ofertas y acciones realizadas.
- **Archivos:** R2 para tickets de compra.
- **Agente:** Strands Agents SDK con Amazon Bedrock y herramientas de dominio propias.
- **Continuidad:** si el servicio de AWS no esta disponible, la demo conserva respuestas seguras y deterministas.

Ver [arquitectura completa](docs/architecture.md).

## Ejecutar la aplicacion

Requiere Node.js 22.13 o posterior y pnpm.

```bash
pnpm install
pnpm dev
```

La aplicacion se abre en `http://localhost:3000` o en el siguiente puerto disponible.

## Ejecutar el agente Strands

Requiere Python 3.11 o posterior, una cuenta AWS y acceso a Amazon Bedrock.

```bash
cd agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn api:app --reload --port 8000
```

Luego establecer `NUTRIAHORRO_AGENT_URL=http://localhost:8000` en la aplicacion web. Las credenciales AWS se configuran en el entorno local o mediante un rol de AWS; nunca se guardan en el repositorio.

Ver [configuracion AWS](docs/aws-setup.md).

## Verificacion

```bash
pnpm lint
pnpm build
pnpm exec tsc --noEmit
python agent/test_tools.py
```

## Entrega

- [Guia maestra de entrega](docs/ENTREGA-COMPLETA-ES.md)
- [Guia de presentacion](docs/submission-checklist-es.md)
- [Guion de demostracion](docs/demo-script-es.md)
- [Texto para Devpost](docs/devpost-submission.md)
- [Division del trabajo](docs/team-handoff-es.md)
- [Privacidad y seguridad](docs/security-privacy-es.md)

## Licencia

MIT. Ver [LICENSE](LICENSE).
