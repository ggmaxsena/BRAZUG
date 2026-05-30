import { blizzardService } from '../src/services/blizzard.service';
import { syncService } from '../src/services/sync.service';

async function runDailySync() {
  console.log('[WORKER] Starting daily guild sync...');
  const realm = 'doomhowl';
  const guildName = 'brazug';

  try {
    const rosterData = await blizzardService.getGuildRoster(realm, guildName);
    const members = rosterData.members;

    console.log(`[WORKER] Found ${members.length} members. Syncing...`);

    for (const member of members) {
      const name = member.character.name.toLowerCase();
      try {
        await syncService.syncCharacter(realm, name, 'us');
        console.log(`[WORKER] Synced ${name}`);
      } catch (e) {
        console.error(`[WORKER] Failed to sync ${name}`);
      }
    }
    console.log('[WORKER] Daily sync complete.');
  } catch (e) {
    console.error('[WORKER] Critical failure:', e);
  }
}

runDailySync();
