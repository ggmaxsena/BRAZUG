import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL

  // DEBUG LOGGING
  console.log("DEBUG: DATABASE_URL loaded, length:", connectionString?.length);
  console.log("DEBUG: DATABASE_URL preview:", connectionString?.substring(0, 30));

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined')
  }

  // Parse connection string manually to handle special characters in password
  const url = new URL(connectionString);
  const pool = new pg.Pool({
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1),
  })
  
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
