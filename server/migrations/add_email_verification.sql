-- Migration: Add email verification fields to users table
-- Run this migration to add email verification support

-- Add email_verified column (defaults to false for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add verification_token column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);

-- Add verification_token_expiry column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMP;

-- Update existing users to be verified (optional - remove if you want to verify all existing users)
-- UPDATE users SET email_verified = true WHERE email_verified IS NULL;

-- Create index on verification_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

