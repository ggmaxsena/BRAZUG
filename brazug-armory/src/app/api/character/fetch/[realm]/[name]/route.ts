import { NextResponse } from 'next/server';
import { blizzardService } from '@/services/blizzard.service';
import { characterService } from '@/services/character.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ realm: string, name: string }> }
) {
  let realm = '';
  let name = '';

  try {
    const resolvedParams = await params;
    realm = resolvedParams.realm;
    name = resolvedParams.name;

    if (!realm || !name) {
      return NextResponse.json({ error: 'Missing realm or name' }, { status: 400 });
    }

    console.log(`[API-FETCH] Fetching ${name} from ${realm}`);
    
    // Fetch all data in parallel
    const [profile, equipment, media, professions, specializations, statistics] = await Promise.all([
        blizzardService.getCharacterProfile(realm, name),
        blizzardService.getCharacterEquipment(realm, name).catch(() => ({ equipped_items: [] })),
        blizzardService.getCharacterMedia(realm, name).catch(() => ({ assets: [] })),
        blizzardService.getCharacterProfessions(realm, name).catch(() => ({ primaries: [], secondaries: [] })),
        blizzardService.getCharacterSpecializations(realm, name).catch(() => ({})),
        blizzardService.getCharacterStatistics(realm, name).catch(() => ({}))
    ]);

    // Extract Media (Avatar)
    const avatarUrl = media.assets?.find((a: any) => a.key === 'avatar')?.value 
                   || media.assets?.find((a: any) => a.key === 'main')?.value;

    // Transform Professions (Primary and Secondary)
    const professionList: any[] = [];
    const processProfs = (profs: any[]) => {
        if (!profs) return;
        profs.forEach((p: any) => {
            professionList.push({
                name: p.profession.name,
                skillPoints: p.rank,
                maxSkillPoints: p.profession.max_rank || 300,
            });
        });
    };

    if (professions.primaries) processProfs(professions.primaries);
    if (professions.secondaries) processProfs(professions.secondaries);

    // Transform Equipment
    const itemPromises = (equipment.equipped_items || []).map(async (item: any) => {
        const itemId = item.item.id;
        // Tenta resolver o ícone real via serviço
        const details = await characterService.getItemDetails(itemId).catch(() => null);
        return {
            slot: item.slot.type,
            itemId: itemId,
            name: item.name,
            quality: item.quality.type,
            icon: details?.icon || item.media?.id?.toString()
        };
    });

    const items = await Promise.all(itemPromises);

    return NextResponse.json({
      name: profile.name,
      class: profile.character_class.name,
      race: profile.race.name,
      level: profile.level,
      guild: profile.guild ? profile.guild.name : 'BRAZUG',
      avatarUrl: avatarUrl || null,
      professions: professionList,
      items: items,
      extra_data: {
        specializations: specializations,
        statistics: statistics
      }
    });
  } catch (error: any) {
    const errorId = Math.random().toString(36).substring(7);
    console.error(`[API-FETCH][${errorId}] Error for ${name}-${realm}:`, error);
    
    let status = 500;
    let message = error.message;

    if (error.response) {
      status = error.response.status;
      message = error.response.data?.detail || error.response.data?.error || error.message;
    }

    return NextResponse.json(
      { 
        error: `Blizzard API Error: ${message}`,
        errorId,
        details: error.stack?.substring(0, 200)
      }, 
      { status: typeof status === 'number' ? status : 500 }
    );
  }
}
