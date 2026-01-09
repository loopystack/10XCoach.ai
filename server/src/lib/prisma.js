const path = require('path');
// Ensure .env is loaded before PrismaClient is instantiated
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Build DATABASE_URL from individual variables if not set
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME || '10x_dashboard';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'password';
  process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

module.exports = prisma;

