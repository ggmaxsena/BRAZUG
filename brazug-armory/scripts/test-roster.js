"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blizzard_service_1 = require("../src/services/blizzard.service");
async function testRosterFormat() {
    const realm = 'doomhowl';
    const guildName = 'brazug';
    try {
        const rosterData = await blizzard_service_1.blizzardService.getGuildRoster(realm, guildName);
        console.log('[TEST] First member:', JSON.stringify(rosterData.members[0], null, 2));
    }
    catch (e) {
        console.error('[TEST] Error:', e);
    }
}
testRosterFormat();
