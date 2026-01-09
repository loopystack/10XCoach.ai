-- Update test user with correct password hash
UPDATE users
SET password_hash = '$2a$12$ig0iI9BIqynwa0Tr6YyHweI4KI82qgkYGspC7A2K2ZetuIkktUkia'
WHERE email = 'test@example.com';
