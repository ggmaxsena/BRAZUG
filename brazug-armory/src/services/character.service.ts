import prisma from '../lib/prisma';
import { Character, CharacterItem as PrismaItem, CharacterProfession as PrismaProfession, CharacterProfile } from '@prisma/client';

console.log("DATABASE_URL sendo usada pelo serviço:", process.env.DATABASE_URL);

export interface CharacterItem extends PrismaItem {}
export interface CharacterProfession extends PrismaProfession {}

// Re-exporting legacy interfaces for compatibility
export interface ItemData extends Omit<CharacterItem, 'id' | 'characterId'> {}
export interface ProfessionData extends Omit<CharacterProfession, 'id' | 'characterId'> {}

export interface CharacterDetail {
  id: number | null;
  name: string;
  realm: string;
  region: string;
  class: string;
  race: string;
  gender: string;
  level: number;
  guild: string | null;
  spec: string | null;
  avatarUrl: string | null;
  extraData: any | null;
  lastSync: Date | null;
  updatedAt: Date | null;
  items: CharacterItem[];
  professions: CharacterProfession[];
  profiles: CharacterProfile[];
  isManualOnly: boolean;
}

class CharacterService {
  // ... (keep methods, but update return types to CharacterDetail)

  async upsertCharacter(data: Omit<Character, 'id' | 'lastSync' | 'updatedAt'>) {
    return prisma.character.upsert({
      where: {
        name_realm_region: {
          name: data.name,
          realm: data.realm,
          region: data.region,
        },
      },
      update: {
        class: data.class,
        race: data.race,
        gender: data.gender,
        level: data.level,
        guild: data.guild,
        spec: data.spec,
        avatarUrl: data.avatarUrl,
        extraData: data.extraData as any,
        updatedAt: new Date(),
      },
      create: {
        ...data,
        extraData: data.extraData as any,
      },
    });
  }

  async updateItems(characterId: number, items: Omit<CharacterItem, 'id' | 'characterId'>[]) {
    console.log(`[DB-DEBUG] Atualizando itens para CharacterID: ${characterId}. Itens recebidos: ${items.length}`);
    
    // 1. Garantir que os itens mestres existam na tabela Item
    // Isso é necessário por causa da FK em CharacterItem
    for (const item of items) {
      try {
        await prisma.item.upsert({
          where: { id: item.itemId },
          update: {
            name: item.name || '',
            quality: item.quality || '',
            icon: item.icon,
          },
          create: {
            id: item.itemId,
            name: item.name || '',
            quality: item.quality || '',
            icon: item.icon,
          },
        });
      } catch (e: any) {
        console.warn(`[DB-DEBUG] Erro ao dar upsert no item ${item.itemId}: ${e.message}`);
      }
    }

    // 2. Deleta itens antigos do personagem
    const deleted = await prisma.characterItem.deleteMany({
      where: { characterId },
    });
    console.log(`[DB-DEBUG] Itens antigos deletados: ${deleted.count}`);

    // 3. Insere os novos
    const created = await prisma.characterItem.createMany({
      data: items.map(item => ({
        ...item,
        characterId,
      })),
    });
    console.log(`[DB-DEBUG] Itens novos inseridos: ${created.count}`);
    return created;
  }

  async updateProfessions(characterId: number, professions: Omit<CharacterProfession, 'id' | 'characterId'>[]) {
    // Clean up old professions first
    await prisma.characterProfession.deleteMany({
      where: { characterId },
    });

    // Bulk create new professions
    return prisma.characterProfession.createMany({
      data: professions.map(prof => ({
        ...prof,
        characterId,
      })),
    });
  }

  async getCharacter(name: string, realm: string, region: string): Promise<CharacterDetail | null> {
    // 1. Get from armory - Busca insensível a maiúsculas/minúsculas
    const character = await prisma.character.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        realm: { equals: realm, mode: 'insensitive' },
        region: { equals: region, mode: 'insensitive' },
      },
      include: {
        items: true,
        professions: true,
      },
    });

    if (!character) {
        console.log(`[DB-DEBUG] Personagem ${name} não encontrado no banco.`);
        return null;
    }
    
    console.log(`[DB-DEBUG] Personagem ${name} encontrado. Itens: ${character.items.length}`);
    character.items.forEach(it => console.log(`[DB-DEBUG] Item: ${it.name} Slot: ${it.slot}`));

    // 2. Get from custom profiles - Apenas personagens VIVOS
    const profile = await prisma.characterProfile.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        realm: { equals: realm, mode: 'insensitive' },
        region: { equals: region, mode: 'insensitive' },
        isDead: false // Regra BRAZUG: Armory é apenas para os vivos
      },
      include: {
        user: true
      }
    });

    return {
        ...character,
        extraData: character.extraData as any,
        items: character.items || [],
        professions: character.professions || [],
        profiles: profile ? [profile] : [],
        isManualOnly: false
    };
  }

  async listCharactersByRealm(realm: string, region: string) {
    return prisma.character.findMany({
      where: {
        realm,
        region,
      },
    });
  }

  async getItemDetails(itemId: number) {
    // 1. Tentar pegar do banco local
    let item = await prisma.item.findUnique({
      where: { id: itemId }
    });

    // 2. Se não existe ou não tem tooltipData, buscar na Blizzard
    if (!item || !item.tooltipData) {
      console.log(`[ITEM-SERVICE] Fetching item ${itemId} from Blizzard...`);
      try {
        const [data, media] = await Promise.all([
          blizzardService.getItem(itemId),
          blizzardService.getItemMedia(itemId).catch(() => null)
        ]);

        // Extração de ícone mais robusta
        let icon = null;
        if (media && media.assets) {
          icon = media.assets.find((a: any) => a.key === 'icon' || a.key === 'value')?.value;
        }
        
        // Fallback: Se não encontrou no media, tenta extrair do 'icon' do item (algumas versões da API mandam aqui)
        if (!icon && data.icon) icon = data.icon;
        
        // Se ainda não tem, tenta reconstruir baseado no slug/name (último recurso)
        if (!icon && data.media?.id) icon = `item_${data.media.id}`;

        item = await prisma.item.upsert({
          where: { id: itemId },
          update: {
            name: data.name,
            quality: data.quality.type,
            icon: icon || item?.icon,
            tooltipData: data as any,
            lastUpdated: new Date()
          },
          create: {
            id: itemId,
            name: data.name,
            quality: data.quality.type,
            icon: icon,
            tooltipData: data as any,
          }
        });
      } catch (e: any) {
        console.warn(`[ITEM-SERVICE] Failed to fetch item ${itemId}: ${e.message}`);
        return item; // Retorna o que tem (ou null)
      }
    }

    return item;
  }

  async linkProfileToCharacter(character: Character) {
    // Find matching profile (case-insensitive) - Apenas VIVOS
    const profile = await prisma.characterProfile.findFirst({
      where: {
        name: { equals: character.name, mode: 'insensitive' },
        realm: { equals: character.realm, mode: 'insensitive' },
        region: { equals: character.region, mode: 'insensitive' },
        isDead: false
      },
    });

    if (profile) {
      console.log(`[CHARACTER-SERVICE] Linking profile ${profile.name} to character ${character.id}`);
      
      const updateData: any = {
        characterId: character.id,
        // Sync basic info from Blizzard
        guild: character.guild || profile.guild,
        race: character.race,
        class: character.class,
        // Only update image if profile doesn't have one (preserve manual lore image)
        imageUrl: profile.imageUrl || character.avatarUrl,
        updatedAt: new Date(),
      };

      // Only sync level if character is NOT dead
      if (!profile.isDead) {
        updateData.level = character.level;
      }

      return prisma.characterProfile.update({
        where: { id: profile.id },
        data: updateData,
      });
    }

    return null;
  }
}

export const characterService = new CharacterService();
