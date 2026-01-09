-- Change duration column from INTEGER to DECIMAL to support fractional minutes
-- This fixes the error: invalid input syntax for type integer: "0.75"

ALTER TABLE sessions
  ALTER COLUMN duration TYPE DECIMAL(5,2);

-- Add comment explaining the column
COMMENT ON COLUMN sessions.duration IS 'Session duration in minutes (supports fractional minutes for precision)';
