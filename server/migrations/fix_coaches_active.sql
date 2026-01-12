-- =============================================
-- Fix Coaches Active Status
-- This script ensures all coaches are set to active: true
-- Run this on your VPS database to fix the issue
-- =============================================

-- Update all coaches to be active
UPDATE coaches 
SET active = true 
WHERE active IS NULL OR active = false;

-- Verify the update
SELECT id, name, email, active 
FROM coaches 
ORDER BY id;

-- Expected result: All coaches should have active = true

