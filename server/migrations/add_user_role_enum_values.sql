-- Add new enum values to UserRole enum
-- This migration adds COACH_ADMIN and SUPER_ADMIN to the existing UserRole enum

-- Add COACH_ADMIN to the enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COACH_ADMIN';

-- Add SUPER_ADMIN to the enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

