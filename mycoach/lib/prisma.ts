import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fix SQLite path for Next.js - ensure database file path is correct
let databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  // Default to prisma/dev.db relative to project root
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
  databaseUrl = `file:${dbPath}`
  process.env.DATABASE_URL = databaseUrl
  console.log('[Prisma] Using default DATABASE_URL:', databaseUrl)
}

if (databaseUrl.startsWith('file:')) {
  // Extract the file path
  const filePath = databaseUrl.replace('file:', '')
  
  // Ensure directory exists
  const dbDir = path.dirname(filePath)
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
      console.log('[Prisma] Created database directory:', dbDir)
    }
    
    // Normalize path for SQLite (use forward slashes)
    const normalizedPath = filePath.replace(/\\/g, '/')
    process.env.DATABASE_URL = `file:${normalizedPath}`
    
    // Check if database file exists
    if (fs.existsSync(filePath)) {
      console.log('[Prisma] Database file found:', filePath)
    } else {
      console.log('[Prisma] Database file will be created:', filePath)
    }
  } catch (error) {
    console.error('[Prisma] Error setting up database path:', error)
    // Continue anyway - Prisma will try to create the database
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

