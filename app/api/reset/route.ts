import { getAppState, resetDemoState } from '@/lib/database';

export async function POST() {
  try {
    await resetDemoState();
    return Response.json(await getAppState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'No se pudo restablecer la demostracion.' }, { status: 500 });
  }
}
