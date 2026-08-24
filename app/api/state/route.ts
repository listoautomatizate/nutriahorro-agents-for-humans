import { getAppState, updateTransport } from '@/lib/database';
import type { TransportMode } from '@/lib/types';

export async function GET() {
  try {
    return Response.json(await getAppState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la informacion.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { transportMode?: TransportMode };
    if (!body.transportMode || !['walking', 'bicycle', 'car', 'motorcycle'].includes(body.transportMode)) {
      return Response.json({ error: 'Selecciona un medio de transporte valido.' }, { status: 400 });
    }
    await updateTransport(body.transportMode);
    return Response.json(await getAppState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo guardar el transporte.' }, { status: 500 });
  }
}
