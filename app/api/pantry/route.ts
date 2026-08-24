import { deletePantryItem, getAppState, upsertPantryItem } from '@/lib/database';
import type { PantryItem } from '@/lib/types';

const allowedStatuses = ['ok', 'soon', 'low'];

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<PantryItem>;
    if (!body.name?.trim() || !body.category?.trim() || !body.unit?.trim() || Number(body.quantity) <= 0) {
      return Response.json({ error: 'Completa nombre, categoria, cantidad y unidad.' }, { status: 400 });
    }
    const item: PantryItem = {
      id: body.id || crypto.randomUUID(),
      name: body.name.trim(),
      category: body.category.trim(),
      quantity: Number(body.quantity),
      unit: body.unit.trim(),
      purchasedAt: body.purchasedAt || new Date().toISOString(),
      bestBefore: body.bestBefore || new Date(Date.now() + 7 * 86400000).toISOString(),
      source: body.source?.trim() || 'Carga manual',
      status: allowedStatuses.includes(body.status || '') ? body.status as PantryItem['status'] : 'ok',
    };
    await upsertPantryItem(item);
    return Response.json(await getAppState(), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo guardar el alimento.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'Falta el alimento.' }, { status: 400 });
    await deletePantryItem(id);
    return Response.json(await getAppState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo eliminar el alimento.' }, { status: 500 });
  }
}
