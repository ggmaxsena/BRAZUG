import { blizzardService } from '../src/services/blizzard.service';

async function testMultipleCharacters() {
  const realm = 'doomhowl';
  const guildName = 'brazug';

  try {
    const rosterData = await blizzardService.getGuildRoster(realm, guildName);
    // Take first 5 characters
    const members = rosterData.members.slice(0, 5);

    for (const member of members) {
      const name = member.character.name.toLowerCase();
      console.log(`[TEST] Trying ${name}`);
      try {
        const profile = await blizzardService.getCharacterProfile(realm, name);
        console.log(`[TEST] Successfully fetched ${name}:`, profile.name);
      } catch (e) {
        console.error(`[TEST] Failed to fetch ${name}`);
      }
    }
  } catch (e) {
    console.error('[TEST] Error fetching roster:', e);
  }
}

testMultipleCharacters();
