# Devpost submission copy

## Project name

nutrIAhorro

## Tagline

An everyday AI agent that turns pantry memory, nutrition goals, nearby prices, and travel cost into practical food decisions.

## Inspiration

People lose food, money, and time because pantry tracking, meal planning, and supermarket comparison live in separate places. A cheap promotion can also become expensive when travel is ignored. We wanted one agent that remembers what a person has, understands what should be used first, and only interrupts when there is a useful decision to make.

## What it does

nutrIAhorro stores a persistent pantry from receipt uploads or manual input, flags low-stock and expiring items, calculates general nutrition targets from the user's goals, suggests meals based on available food and time, deducts ingredients after confirmation, and compares nearby supermarket baskets including walking, bicycle, car, or motorcycle cost.

The current Maldonado demo uses clearly labeled fictional prices for El Dorado, Ta-Ta, Disco, and Tienda Inglesa. Nutrition targets are general wellness preferences and are not medical advice.

## How we built it

The agent is implemented with Strands Agents SDK and Amazon Bedrock. Its tools retrieve the user profile and pantry, suggest meals, compare shopping options, and register cooked meals after confirmation. The web product uses React, vinext, D1 for persistent structured memory, and R2 for receipt files.

## Challenges

The hardest design problem was deciding when automation should act and when it should ask. We made pantry deductions confirmation-based, separated demo prices from live claims, included travel cost in shopping comparisons, and kept a safe fallback so the product remains useful when the cloud model is unavailable.

## Accomplishments

- A coherent end-to-end experience rather than a chat-only prototype.
- Durable pantry memory with expiry and low-stock priorities.
- Agent tools that complete real actions and update state.
- Contextual supermarket comparison that accounts for proximity.
- Personalized goals connected to calories, macros, recipes, and pantry decisions.
- A privacy-conscious design with no secrets in source control.

## What we learned

An everyday agent becomes valuable when it reduces decisions, not when it generates more content. Combining food already owned, time, preferences, distance, and transport changed the recommendation from a generic recipe into a practical next action.

## What's next

We plan to add consent-based live supermarket catalogs, multimodal receipt extraction with human review, household profiles, configurable reminders, and an AgentCore deployment for managed production operation.

## Built with

Strands Agents SDK, Amazon Bedrock, Amazon Nova Lite, React, vinext, Cloudflare D1, Cloudflare R2, TypeScript, Python, and FastAPI.

## Disclosure

The project was newly created during the hackathon period with standard open-source frameworks and AI-assisted development. All included supermarket prices and receipt contents are fictional demo data unless explicitly replaced by a cited current catalog.
