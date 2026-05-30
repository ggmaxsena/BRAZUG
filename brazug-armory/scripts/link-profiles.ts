import prisma from '../src/lib/prisma';

async function main() {
  console.log('Starting data migration to link profiles to characters...');

  const profiles = await prisma.characterProfile.findMany();
  let updatedCount = 0;

  for (const profile of profiles) {
    // Find matching character
    const character = await prisma.character.findUnique({
      where: {
        name_realm_region: {
          name: profile.name,
          realm: profile.realm || 'doomhowl',
          region: profile.region || 'us',
        },
      },
    });

    if (character) {
      await prisma.characterProfile.update({
        where: { id: profile.id },
        data: { characterId: character.id },
      });
      updatedCount++;
      console.log(`Linked profile ${profile.name} to character ID ${character.id}`);
    }
  }

  console.log(`Migration finished. ${updatedCount} profiles linked.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
