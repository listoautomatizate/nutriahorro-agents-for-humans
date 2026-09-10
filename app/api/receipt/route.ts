import { getAppState, saveUpload, upsertPantryItem } from '@/lib/database';
import { getAgentEnvironment } from '@/lib/agent-environment';
import { createReceiptDemoItems } from '@/lib/demo-data';
import type { PantryItem } from '@/lib/types';

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const defaultShelfLife: Record<string, number> = {
  Protein: 3, Vegetable: 5, Fruit: 5, Carbohydrate: 120, Fat: 180, Other: 14,
};
const allowedCategories = Object.keys(defaultShelfLife);
const allowedUnits = ['units', 'g', 'kg', 'ml', 'l'];
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return btoa(binary);
}

function normalizeParsedItems(value: unknown, source: string): PantryItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    const name = String(item.name || '').trim();
    const quantity = Number(item.quantity);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) return [];
    const proposedCategory = String(item.category || 'Other');
    const category = allowedCategories.includes(proposedCategory) ? proposedCategory : 'Other';
    const proposedUnit = String(item.unit || 'units').toLowerCase();
    const unit = allowedUnits.includes(proposedUnit) ? proposedUnit : 'units';
    const normalizedQuantity = unit === 'kg' || unit === 'l' ? quantity * 1000 : quantity;
    const normalizedUnit = unit === 'kg' ? 'g' : unit === 'l' ? 'ml' : unit;
    const shelfLife = Math.max(1, Math.min(365, Number(item.best_before_days) || defaultShelfLife[category] || 14));
    return [{
      id: `receipt-${Date.now()}-${index}`,
      name,
      category,
      quantity: normalizedQuantity,
      unit: normalizedUnit,
      purchasedAt: new Date().toISOString(),
      bestBefore: addDays(shelfLife),
      source: String(item.source || source || 'Ticket'),
      status: shelfLife <= 3 ? 'soon' : 'ok',
    } satisfies PantryItem];
  });
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('receipt');
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: 'Select a receipt photo.' }, { status: 400 });
    }
    if (!allowedImageTypes.includes(file.type)) {
      return Response.json({ error: 'Use a JPG, PNG, WEBP, or GIF image.' }, { status: 400 });
    }
    if (file.size > 1024 * 1024) {
      return Response.json({ error: 'The processed image cannot exceed 1 MB.' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const objectKey = `receipts/${Date.now()}-${safeName}`;
    await saveUpload(file, objectKey);

    const { url: agentUrl, token: agentToken } = getAgentEnvironment();
    if (agentUrl) {
      try {
        const response = await fetch(`${agentUrl}/receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
          },
          body: JSON.stringify({ filename: file.name, contentType: file.type, data: toBase64(await file.arrayBuffer()) }),
          signal: AbortSignal.timeout(25_000),
        });
        if (response.ok) {
          const parsed = await response.json() as { items?: unknown; merchant?: string };
          const parsedItems = normalizeParsedItems(parsed.items, parsed.merchant || 'Ticket');
          if (parsedItems.length) {
            return Response.json({
              parsedItems,
              mode: 'aws-agent',
              message: `The agent recognized ${parsedItems.length} products. Review them before saving.`,
            });
          }
        }
      } catch {
        // The public demo remains usable while the AWS runtime is unavailable.
      }
    }

    return Response.json({
      parsedItems: createReceiptDemoItems(),
      mode: 'demo',
      message: 'Demo receipt data loaded. Review it before saving.',
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'The receipt could not be processed.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { items?: unknown };
    const items = normalizeParsedItems(body.items, 'Confirmed receipt');
    if (!items.length) return Response.json({ error: 'There are no valid products to save.' }, { status: 400 });

    for (const item of items) await upsertPantryItem(item);
    return Response.json({
      state: await getAppState(),
      message: `${items.length} products confirmed and added to your pantry.`,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'The products could not be saved.' }, { status: 500 });
  }
}
