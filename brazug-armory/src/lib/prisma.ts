import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prismaClientSingleton = () => {
  let connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined')
  }

  // Se a senha contém caracteres especiais como '!', ela precisa estar URL-encoded para o Prisma/PgPool.
  // Vamos tentar reconstruir a URL garantindo o encoding da senha se necessário.
  try {
    const url = new URL(connectionString);
    if (url.password && !url.password.includes('%')) {
      url.password = encodeURIComponent(url.password);
      connectionString = url.toString();
    }
  } catch (e) {
    console.warn("[Prisma] Could not parse DATABASE_URL for auto-encoding, using as-is.");
  }

  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
