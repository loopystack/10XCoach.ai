// Helper script to build DATABASE_URL from individual environment variables
require('dotenv').config();

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;
const database = process.env.DB_NAME || '10x_dashboard';
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'password';

const databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;

console.log('Built DATABASE_URL:', databaseUrl.replace(password, '***'));
process.env.DATABASE_URL = databaseUrl;

module.exports = databaseUrl;

