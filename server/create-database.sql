-- Create Database Script for 10X Dashboard
-- Run this script as a PostgreSQL superuser (usually 'postgres')

-- Create the database (if it doesn't exist)
-- Note: This will fail if the database already exists, which is fine
SELECT 'CREATE DATABASE "10x_dashboard"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '10x_dashboard')\gexec

-- Connect to the new database
\c "10x_dashboard"

-- Verify connection
SELECT current_database(), current_user;

-- Note: After running this script, proceed with:
-- 1. npm run db:generate
-- 2. npm run db:push
-- 3. npm run db:seed (optional)

