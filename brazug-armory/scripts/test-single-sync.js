"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sync_service_1 = require("../src/services/sync.service");
async function testSingleSync() {
    const realm = 'doomhowl';
    const name = 'gekz'; // Character name with no special characters
    console.log(`[TEST] Starting sync for ${name}-${realm}`);
    try {
        await sync_service_1.syncService.syncCharacter(realm, name, 'us');
        console.log(`[TEST] Successfully synced ${name}`);
    }
    catch (e) {
        console.error(`[TEST] Failed to sync ${name}:`, e);
    }
}
testSingleSync();
