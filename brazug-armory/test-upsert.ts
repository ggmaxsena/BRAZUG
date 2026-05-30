import { characterService } from './src/services/character.service';
import prisma from './src/lib/prisma';

async function test() {
  try {
    console.log('Testing character upsert...');
    const res = await characterService.upsertCharacter({
      name: 'TestChar',
      realm: 'Doomhowl',
      region: 'us',
      class: 'Warrior',
      race: 'Orc',
      gender: 'Male',
      level: 60,
      guild: 'BRAZUG',
      spec: 'Fury',
      avatarUrl: null,
      extraData: { test: true }
    });
    console.log('Success:', res);
  } catch (e: any) {
    console.error('Failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
