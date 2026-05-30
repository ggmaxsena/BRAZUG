"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blizzard_service_1 = require("../src/services/blizzard.service");
const sync_service_1 = require("../src/services/sync.service");
async function runDailySync() {
    console.log('[WORKER] Starting daily guild sync...');
    const realm = 'doomhowl';
    const guildName = 'brazug';
    try {
        const rosterData = await blizzard_service_1.blizzardService.getGuildRoster(realm, guildName);
        const members = rosterData.members;
        console.log(`[WORKER] Found ${members.length} members. Syncing...`);
        for (const member of members) {
            const name = member.character.name.toLowerCase();
            try {
                await sync_service_1.syncService.syncCharacter(realm, name, 'us');
                console.log(`[WORKER] Synced ${name}`);
            }
            catch (e) {
                console.error(`[WORKER] Failed to sync ${name}`);
            }
        }
        console.log('[WORKER] Daily sync complete.');
    }
    catch (e) {
        console.error('[WORKER] Critical failure:', e);
    }
}
runDailySync();
