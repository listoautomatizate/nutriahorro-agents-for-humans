import { getAppState, saveUpload, upsertPantryItem } from '@/lib/database';
import { receiptDemoItems } from '@/lib/demo-data';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('receipt');
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: 'Selecciona una foto o archivo del ticket.' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ error: 'El archivo no puede superar 8 MB.' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const objectKey = `receipts/${Date.now()}-${safeName}`;
    await saveUpload(file, objectKey);
    for (const item of receiptDemoItems) await upsertPantryItem(item);

    return Response.json({
      state: await getAppState(),
      parsedItems: receiptDemoItems,
      mode: 'demo',
      message: 'Ticket guardado. El MVP reconocio 6 alimentos de la compra de prueba.',
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo procesar el ticket.' }, { status: 500 });
  }
}
