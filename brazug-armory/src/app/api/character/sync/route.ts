import { syncService } from '@/services/sync.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[API-SYNC] Rota de sincronização chamada!');
  try {
    const { name, realm, region } = await request.json();

    if (!name || !realm || !region) {
      return NextResponse.json(
        { error: 'Missing character name, realm, or region' },
        { status: 400 }
      );
    }

    const character = await syncService.syncCharacter(realm, name, region);

    return NextResponse.json(character);
  } catch (error: any) {
    console.error(`Sync API Error [${error.response?.status || 'no-status'}]:`, error.response?.data || error.message);

    // Check for Axios error (e.g. 404 from Blizzard)
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.detail || error.message;
      return NextResponse.json(
        { error: `Blizzard API Error: ${status} ${message}` },
        { status: status === 404 ? 404 : 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
