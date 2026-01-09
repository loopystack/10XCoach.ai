-- Make session transcript/notes fields large enough for full JSON transcripts
-- Fixes 500 errors when updating sessions with long transcripts via Prisma routes.

ALTER TABLE sessions
  ALTER COLUMN transcript_ref TYPE TEXT;

ALTER TABLE sessions
  ALTER COLUMN notes_ref TYPE TEXT;


