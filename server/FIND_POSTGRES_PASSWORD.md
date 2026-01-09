# How to Find Your PostgreSQL Password

Since you already have users in your database, you must have PostgreSQL running. Here's how to find or update your password:

## Method 1: Check Your Database Tool

If you're using a database management tool (pgAdmin, DBeaver, DataGrip, etc.), check:
1. Open your database tool
2. Look for saved connections or connection settings
3. The password should be visible in the connection properties (may be masked)
4. Copy that password

## Method 2: Check if You Have a pgpass File

Windows: `%APPDATA%\postgresql\pgpass.conf`
- Check if this file exists
- It may contain your saved password

## Method 3: Reset PostgreSQL Password (if you have admin access)

If you're on Windows and installed PostgreSQL locally:

1. Open Command Prompt as Administrator
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\{version}\bin`)
3. Run:
   ```cmd
   psql -U postgres
   ```
   (This might prompt for password - if you don't know it, use Method 4)

4. Once connected, you can change the password:
   ```sql
   ALTER USER postgres WITH PASSWORD 'your_new_password';
   ```

## Method 4: Reset via pg_hba.conf (if you have file system access)

1. Find `pg_hba.conf` (usually in `C:\Program Files\PostgreSQL\{version}\data\`)
2. Temporarily change authentication method to `trust`:
   ```
   host    all             all             127.0.0.1/32            trust
   ```
3. Restart PostgreSQL service
4. Connect without password: `psql -U postgres`
5. Change password: `ALTER USER postgres WITH PASSWORD 'new_password';`
6. Change `pg_hba.conf` back to `md5` or `scram-sha-256`
7. Restart PostgreSQL service

## Method 5: Use the Interactive Script

Run the PowerShell script to update credentials:

```powershell
cd server
.\update-db-password.ps1
```

## Quick Update (Manual)

Edit `server/.env` and update this line:

```env
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/10x_dashboard"
```

Replace `YOUR_ACTUAL_PASSWORD` with your actual PostgreSQL password.

## Common Default Passwords (Try These)

- Empty password (just `postgres:`)
- `postgres`
- `admin`
- `password`
- `123456`
- The password you set during PostgreSQL installation

## After Updating Password

Test the connection:
```bash
cd server
node test-db-connection.js
```

Then restart your server:
```bash
npm run unified
```

