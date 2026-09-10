import { getAppState, resetDemoState } from '@/lib/database';

export async function POST() {
  try {
    await resetDemoState();
    return Response.json(await getAppState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'The demo could not be reset.' }, { status: 500 });
  }
}
