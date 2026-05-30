import { blizzardService } from '../src/services/blizzard.service';

async function testBaseProfile() {
  const realm = 'doomhowl';
  const name = 'gekz';

  console.log(`[TEST] Trying base profile for ${name}-${realm}`);
  try {
    // Call the base profile endpoint directly
    const profile = await blizzardService.getCharacterProfile(realm, name);
    console.log('[TEST] Success:', profile.name);
  } catch (e: any) {
    console.error('[TEST] Failed base profile:', e.message);
  }
}

testBaseProfile();
