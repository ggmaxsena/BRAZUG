const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkItems() {
    try {
        const char = await p.character.findFirst({
            where: { name: 'Gekz' },
            include: { items: true }
        });
        if (char) {
            console.log("Items count:", char.items.length);
            console.log(JSON.stringify(char.items, null, 2));
        } else {
            console.log("Character Gekz not found.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await p.$disconnect();
    }
}

checkItems();
