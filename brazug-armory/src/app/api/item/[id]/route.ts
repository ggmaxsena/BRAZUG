import { NextResponse } from 'next/server';
import { characterService } from '@/services/character.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);

    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const item = await characterService.getItemDetails(itemId);
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error(`[API-ITEM] Error fetching item:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
