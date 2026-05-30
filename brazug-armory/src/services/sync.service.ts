import { blizzardService } from './blizzard.service';
import { characterService, ItemData, ProfessionData } from './character.service';
import fs from 'fs';
import path from 'path';

console.log('sync.service.ts file loaded');
logToFile('sync.service.ts file loaded');

function logToFile(message: string) {
  const logPath = path.join(process.cwd(), 'sync-debug.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

class SyncService {
  async syncCharacter(realm: string, characterName: string, region: string) {
    try {
      logToFile(`Starting full sync for ${characterName}-${realm} (${region})`);
      console.log(`[SYNC] Starting full sync for ${characterName}-${realm} (${region})`);

      // 1. Fetch all data in parallel
      console.log(`[SYNC] Fetching profile for ${characterName}...`);
      const fetchProfile = blizzardService.getCharacterProfile(realm, characterName)
        .catch(e => { 
          console.error(`[SYNC] CRITICAL: Failed profile fetch for ${characterName}: ${e.message}`); 
          throw e; 
        });

      const fetchEquipment = blizzardService.getCharacterEquipment(realm, characterName)
        .catch(e => { 
          console.warn(`[SYNC] Equipment 404 for ${characterName}, skipping.`); 
          return { equipped_items: [] }; 
        });

      const fetchMedia = blizzardService.getCharacterMedia(realm, characterName)
        .catch(e => { 
          console.warn(`[SYNC] Media 404 for ${characterName}, skipping.`); 
          return { assets: [] }; 
        });

      const fetchProfessions = blizzardService.getCharacterProfessions(realm, characterName)
        .catch(e => { 
          console.warn(`[SYNC] Professions 404 for ${characterName}, skipping.`); 
          return { primaries: [], secondaries: [] }; 
        });

      const fetchStats = blizzardService.getCharacterStatistics(realm, characterName)
        .catch(e => {
          console.warn(`[SYNC] Statistics 404 for ${characterName}: ${e.message}`);
          logToFile(`Statistics 404 for ${characterName}: ${e.message}`);
          return null;
        });

      const fetchSpecs = blizzardService.getCharacterSpecializations(realm, characterName)
        .catch(e => {
          console.warn(`[SYNC] Specializations 404 for ${characterName}: ${e.message}`);
          logToFile(`Specializations 404 for ${characterName}: ${e.message}`);
          return null;
        });

      const fetchReputations = blizzardService.getCharacterReputations(realm, characterName)
        .catch(e => {
          console.warn(`[SYNC] Reputations 404 for ${characterName}: ${e.message}`);
          logToFile(`Reputations 404 for ${characterName}: ${e.message}`);
          return null;
        });

      const fetchAchievements = blizzardService.getCharacterAchievements(realm, characterName)
        .catch(e => {
          console.warn(`[SYNC] Achievements 404 for ${characterName}: ${e.message}`);
          logToFile(`Achievements 404 for ${characterName}: ${e.message}`);
          return null;
        });

      const [profile, equipment, media, professions, stats, specs, reputations, achievements] = await Promise.all([
        fetchProfile,
        fetchEquipment,
        fetchMedia,
        fetchProfessions,
        fetchStats,
        fetchSpecs,
        fetchReputations,
        fetchAchievements,
      ]);

      console.log(`[SYNC] Profile data for ${characterName}:`, JSON.stringify(profile, null, 2));
      console.log(`[SYNC] Equipment data for ${characterName}:`, JSON.stringify(equipment, null, 2));

      // 2. Extract Media (Avatar)
      const avatarUrl = media.assets?.find((a: any) => a.key === 'avatar')?.value 
                     || media.assets?.find((a: any) => a.key === 'main')?.value;

      // 3. Upsert Base Character
      console.log(`[SYNC] Upserting character ${profile.name} (Level ${profile.level})...`);
      
      // Determinar Spec Ativa corretamente para Classic
      let activeSpecName = null;
      if (specs && specs.specialization_groups) {
          const activeGroup = specs.specialization_groups.find((g: any) => g.is_active);
          if (activeGroup && activeGroup.specializations && activeGroup.specializations.length > 0) {
              // No Classic, geralmente só temos uma spec ativa por grupo
              activeSpecName = activeGroup.specializations[0].specialization_name;
          }
      }

      const character = await characterService.upsertCharacter({
        name: profile.name,
        realm: profile.realm.name,
        region: region,
        class: profile.character_class.name,
        race: profile.race.name,
        gender: profile.gender.name,
        level: profile.level, // Garantindo o nível
        guild: profile.guild?.name || null,
        spec: activeSpecName,
        avatarUrl: avatarUrl,
        extraData: {
          statistics: stats,
          specializations: specs,
          reputations: reputations,
          achievements: achievements,
          rawProfile: profile,
        },
      });
      console.log(`[SYNC] Character saved/updated with ID: ${character.id}, Level in DB: ${character.level}`);

      // 4. Transform and Save Items
      console.log(`[SYNC] Saving ${equipment.equipped_items?.length || 0} items...`);
      const items: ItemData[] = (equipment.equipped_items || []).map((item: any) => ({
        slot: item.slot.type,
        itemId: item.item.id,
        name: item.name,
        quality: item.quality.type,
        icon: item.media?.id?.toString(),
      }));
      await characterService.updateItems(character.id, items);
      console.log(`[SYNC] Items saved to database.`);

      // 5. Transform and Save Professions
      const professionList: ProfessionData[] = [];
      
      if (professions.primaries) {
        professions.primaries.forEach((p: any) => {
          professionList.push({
            name: p.profession.name,
            skillPoints: p.rank,
            maxSkillPoints: p.profession.max_rank || 300,
          });
        });
      }
      
      if (professions.secondaries) {
        professions.secondaries.forEach((p: any) => {
          professionList.push({
            name: p.profession.name,
            skillPoints: p.rank,
            maxSkillPoints: p.profession.max_rank || 300,
          });
        });
      }

      await characterService.updateProfessions(character.id, professionList);

      // 6. Automatically link to existing CharacterProfile (legacy website data)
      console.log(`[SYNC] Attempting to link profile for ${character.name}...`);
      await characterService.linkProfileToCharacter(character);

      console.log(`[SYNC] Completed full sync for ${characterName}-${realm}`);
      return characterService.getCharacter(profile.name, profile.realm.name, region);
    } catch (error: any) {
      logToFile(`FAILED to sync character ${characterName}-${realm}: ${error.message} ${error.stack}`);
      console.error(`[SYNC] Failed to sync character ${characterName}-${realm}: ${error.message}`);
      throw error;
    }
  }
}

export const syncService = new SyncService();
