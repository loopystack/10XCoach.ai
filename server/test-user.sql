-- Insert a test user for login testing
INSERT INTO users (name, email, password_hash, role, plan, status, created_at, updated_at)
VALUES (
  'Test User',
  'test@example.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeE7MZTiJcO8qQJWm', -- password: 'password123'
  'USER',
  'FOUNDATION',
  'ACTIVE',
  datetime('now'),
  datetime('now')
);
