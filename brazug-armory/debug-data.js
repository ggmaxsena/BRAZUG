const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkData() {
    try {
        const char = await p.character.findFirst({
            where: { name: 'Skazao' },
            include: { items: true }
        });
        if (char) {
            console.log("Nível no Banco:", char.level);
            console.log("Itens no Banco:", char.items.length);
        } else {
            console.log("Character Skazao not found.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await p.$disconnect();
    }
}

checkData();
