import { blizzardService } from '../src/services/blizzard.service';

async function testRosterFormat() {
  const realm = 'doomhowl';
  const guildName = 'brazug';

  try {
    const rosterData = await blizzardService.getGuildRoster(realm, guildName);
    console.log('[TEST] First member:', JSON.stringify(rosterData.members[0], null, 2));
  } catch (e) {
    console.error('[TEST] Error:', e);
  }
}

testRosterFormat();
