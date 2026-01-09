# PostgreSQL Database Setup

Your project is now configured to use PostgreSQL. You need to update the database connection credentials in `server/.env`.

## Quick Setup

### Option 1: Update DATABASE_URL directly

Edit `server/.env` and update the `DATABASE_URL` line:

```env
DATABASE_URL="postgresql://username:password@host:port/database_name"
```

### Option 2: Use individual variables

Add these to `server/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=10x_dashboard
DB_USER=postgres
DB_PASSWORD=your_actual_password
```

## Finding Your Database Credentials

Since you already have users in your database, you likely know:
- **Database Host**: Usually `localhost` or your server IP
- **Database Port**: Usually `5432` (PostgreSQL default)
- **Database Name**: The name of your database (likely `10x_dashboard` or similar)
- **Database User**: Usually `postgres` or your custom user
- **Database Password**: The password you set when installing PostgreSQL

## Test Connection

After updating the credentials, test the connection:

```bash
cd server
node test-db-connection.js
```

## Interactive Setup Script

Run the interactive setup script:

```bash
cd server
node configure-database.js
```

This will prompt you for your database credentials and test the connection automatically.

## Common Issues

1. **Authentication failed**: Check your PostgreSQL password
2. **Connection refused**: Make sure PostgreSQL is running
3. **Database does not exist**: Create the database or update the name

## Start Server

Once connected, start your server:

```bash
npm run unified
```

