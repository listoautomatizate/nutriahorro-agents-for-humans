# Final narration and shot list, target duration: 4 minutes 35 seconds

## 0:00-0:28 - A decision, not another dashboard

"At six o'clock, the question is rarely just: what should I eat? It is: what do I already have, what will expire first, what fits my goals, how much time do I have, and is that supermarket offer still cheaper after the trip? nutrIAhorro turns that entire decision into one practical answer."

Show Today: priorities, four nutrition metrics, and contextual savings. Reset the fictional demo before recording.

## 0:28-0:58 - Built around a real person

"This Everyday Agent starts with context, not assumptions. The person chooses a general wellness goal, activity, exercise, cooking time, preferences, and transport. nutrIAhorro converts those choices into editable calorie, protein, carbohydrate, and fat references. They are guidance, never diagnosis or medical treatment."

Open Goals and show the relevant fields and the four calculated references.

## 0:58-1:42 - From receipt to trusted memory

"A receipt photo becomes structured pantry candidates, but the agent never changes inventory silently. I can correct the quantity, remove a mistake, and confirm the purchase. Only then does it become persistent pantry memory. Separate batches preserve purchase order, so nutrIAhorro can flag low stock and prioritize the oldest safe food first."

Upload the fictional receipt, edit one candidate, confirm, and open Pantry. Show chicken, tomato, and avocado as priorities.

"This entire demonstration uses fictional receipt contents and prices."

## 1:42-2:37 - One confirmed action, synchronized state

"Now the agent combines available quantities with the person's time and goal. A useful suggestion must actually be cookable. Every recipe shows calories, protein, carbohydrates, and fat, not one isolated macro."

Open Recipes, choose the quick filter, and show all four metrics.

"When I confirm that I cooked this meal, a single operation records all four nutrition values and deducts the exact ingredient quantities from the oldest matching batches. If stock is insufficient, the action is rejected. Here, the daily progress and the pantry update together."

Confirm the meal, show Today, then return to Pantry and show the deduction.

## 2:37-3:12 - The real cost of a promotion

"Shopping recommendations also need context. nutrIAhorro compares nearby baskets and adds the round-trip cost for walking, bicycle, car, or motorcycle. The lowest shelf price is not automatically the best decision. Here, the closest effective option wins. These are labeled demo prices, not live promotions."

Open Shopping and switch transport modes so the effective total changes.

## 3:12-4:14 - The Strands decision loop

Ask: "What should I use first, what can I cook in twenty minutes, and where should I shop?"

"This is where the product becomes an agent. The decision layer is built with Strands Agents SDK. For one request, Strands selects the pantry, recipe, and shopping tools, executes them against current structured memory, and combines their results into one answer."

Show the visible `strands-demo` trace and the three selected tools.

"The same agent exposes six tools: profile, pantry, daily progress, meal suggestions, shopping comparison, and confirmed meal registration. The recorded verification uses our explicitly labeled deterministic demo model, so the genuine Strands tool loop can be reproduced with zero external cost. The provider layer also supports Amazon Bedrock for an AI-backed deployment. Human confirmation remains the boundary before any pantry-changing action."

Briefly show the architecture and six tools in the public repository.

## 4:14-4:35 - Why it matters

"nutrIAhorro is for busy people and households who want to eat with more awareness without turning daily life into a spreadsheet. It helps them waste less food, protect their budget, and make one better decision at a time. That is an agent for humans: useful context, real action, and control that always stays with the person."

End on the public URL, repository URL, and Everyday Agents track.
