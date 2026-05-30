"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blizzard_service_1 = require("../src/services/blizzard.service");
async function testBaseProfile() {
    const realm = 'doomhowl';
    const name = 'gekz';
    console.log(`[TEST] Trying base profile for ${name}-${realm}`);
    try {
        // Call the base profile endpoint directly
        const profile = await blizzard_service_1.blizzardService.getCharacterProfile(realm, name);
        console.log('[TEST] Success:', profile.name);
    }
    catch (e) {
        console.error('[TEST] Failed base profile:', e.message);
    }
}
testBaseProfile();
