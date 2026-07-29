import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import path from 'path'

// Explicitly load .env with override:true so the Supabase URL always wins
// over any stale DATABASE_URL inherited from the sandbox shell.
// (Next.js's built-in .env loader does NOT override existing env vars.)
config({ path: path.join(process.cwd(), '.env'), override: true })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Please check your .env file at project root.'
  )
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: { db: { url: databaseUrl } },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
