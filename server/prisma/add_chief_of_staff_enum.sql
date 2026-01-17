-- Add CHIEF_OF_STAFF to CoachRole enum in PostgreSQL
-- Run this SQL command directly in your PostgreSQL database

ALTER TYPE "CoachRole" ADD VALUE IF NOT EXISTS 'CHIEF_OF_STAFF';

