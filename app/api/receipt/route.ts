import { getAppState, saveUpload, upsertPantryItem } from '@/lib/database';
import { receiptDemoItems } from '@/lib/demo-data';
import type { PantryItem } from '@/lib/types';

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const defaultShelfLife: Record<string, number> = {
  Proteina: 3, Verdura: 5, Fruta: 5, Carbohidrato: 120, Grasa: 180, Otro: 14,
};
const allowedCategories = Object.keys(defaultShelfLife);
const allowedUnits = ['unidades', 'g', 'kg', 'ml', 'l'];
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
    const proposedCategory = String(item.category || 'Otro');
    const category = allowedCategories.includes(proposedCategory) ? proposedCategory : 'Otro';
    const proposedUnit = String(item.unit || 'unidades').toLowerCase();
    const unit = allowedUnits.includes(proposedUnit) ? proposedUnit : 'unidades';
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
      return Response.json({ error: 'Selecciona una foto o archivo del ticket.' }, { status: 400 });
    }
    if (!allowedImageTypes.includes(file.type)) {
      return Response.json({ error: 'Usa una foto JPG, PNG, WEBP o GIF.' }, { status: 400 });
    }
    if (file.size > 1024 * 1024) {
      return Response.json({ error: 'La foto procesada no puede superar 1 MB.' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const objectKey = `receipts/${Date.now()}-${safeName}`;
    await saveUpload(file, objectKey);

    const agentUrl = process.env.NUTRIAHORRO_AGENT_URL?.replace(/\/$/, '');
    if (agentUrl) {
      try {
        const response = await fetch(`${agentUrl}/receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.NUTRIAHORRO_AGENT_TOKEN ? { Authorization: `Bearer ${process.env.NUTRIAHORRO_AGENT_TOKEN}` } : {}),
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
              message: `El agente reconocio ${parsedItems.length} productos. Revisalos antes de guardarlos.`,
            });
          }
        }
      } catch {
        // The public demo remains usable while the AWS runtime is unavailable.
      }
    }

    return Response.json({
      parsedItems: receiptDemoItems,
      mode: 'demo',
      message: 'Use los datos de demostracion. Revisalos antes de guardarlos.',
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo procesar el ticket.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { items?: unknown };
    const items = normalizeParsedItems(body.items, 'Ticket confirmado');
    if (!items.length) return Response.json({ error: 'No hay productos validos para guardar.' }, { status: 400 });

    for (const item of items) await upsertPantryItem(item);
    return Response.json({
      state: await getAppState(),
      message: `${items.length} productos confirmados y agregados a tu despensa.`,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudieron guardar los productos.' }, { status: 500 });
  }
}
