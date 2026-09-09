# nutrIAhorro architecture

![nutrIAhorro architecture](architecture.svg)

## End-to-end flow

1. The person edits general wellness goals or uploads a receipt image.
2. The web product stores structured memory in D1 and receipt files in R2.
3. Receipt images enter a private server route that returns structured candidate items. Nothing enters the pantry until the person reviews and confirms the result.
4. The receipt parser can use the configured private model provider; the public demo uses labeled sample candidates when no provider is connected.
5. A question to the assistant sends the current profile, pantry, recipes, offers, and today's intake to the Strands agent.
6. Strands selects the necessary domain tools through a configured AI model, or through the explicitly labeled deterministic demo adapter used for zero-cost verification.
7. When a cooked meal is confirmed, one transaction records calories, protein, carbohydrates, and fat while deducting exact ingredients from the oldest matching pantry batches.
8. The refreshed state returns to the web UI and low-stock or expiry status is recalculated.

## Agent tools

- `get_user_profile`: reads goals, location, activity, time, preferences, and target range.
- `inspect_pantry`: reads stock, expiry priority, and low-stock items.
- `get_daily_progress`: reads consumed and remaining calories, protein, carbohydrates, and fat.
- `suggest_meals`: filters recipes by actual quantities, time, and requested protein.
- `compare_nearby_shopping`: compares basket price plus round-trip transport cost.
- `register_cooked_meal`: requests confirmation and emits an approved action only after it matches the person's explicit confirmation.

## Trust boundaries

- The public browser never receives model-provider credentials or server secrets.
- Provider credentials remain server-side and are not committed to source control.
- Receipt text is treated as untrusted data; instructions printed inside a receipt are ignored.
- Uploaded receipt candidates are editable and do not mutate pantry state automatically.
- Pantry deductions are rejected when the required quantity is unavailable.
- Duplicate food purchases remain separate batches so first-expiring stock can be consumed first.
- Supermarket prices in the demo are fictional and labeled as such.
- Nutrition calculations are general wellness references, not diagnosis or treatment.

## Continuity mode

If a private model endpoint is unavailable, the web product keeps a narrow deterministic assistant for the public demo. It is labeled `demo-agent` and never pretends that a fallback answer came from a cloud model. Receipt fallback data is also labeled as demonstration data before confirmation.

## Zero-cost Strands verification

`NUTRIAHORRO_MODEL_PROVIDER=demo` runs the genuine Strands event loop, selects the domain tools, executes them against the request state, and returns their result without contacting a paid model. This adapter is deterministic and is not presented as a generative AI model. Amazon Bedrock and OpenAI remain supported private AI providers.

## Deployment scope

The submitted runtime does not use or depend on AgentCore. AWS promotional credits are not needed to install, test, or judge the project.
