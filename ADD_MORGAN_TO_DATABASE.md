# How to Add Morgan (Chief of Staff) to Database

## Step 1: Connect to PostgreSQL

Use the correct syntax (lowercase `-d`):

```bash
psql -U postgres -d 10x_dashboard
```

Or if your database has a different name, check `server/.env` for `DATABASE_URL`.

## Step 2: Run SQL Command

Once connected to PostgreSQL, run:

```sql
ALTER TYPE "CoachRole" ADD VALUE IF NOT EXISTS 'CHIEF_OF_STAFF';
```

Then exit PostgreSQL:
```sql
\q
```

## Step 3: Navigate to Server Directory

```bash
cd /var/www/10XCoach.ai/server
```

## Step 4: Regenerate Prisma Client

```bash
npx prisma generate
```

## Step 5: Run Seed Script

```bash
node prisma/seed.js
```

## Alternative: One-Line Command

If you know your database credentials, you can run everything in one command:

```bash
cd /var/www/10XCoach.ai/server
psql -U postgres -d 10x_dashboard -c "ALTER TYPE \"CoachRole\" ADD VALUE IF NOT EXISTS 'CHIEF_OF_STAFF';"
npx prisma generate
node prisma/seed.js
```

## Troubleshooting

If you get "database does not exist" or "authentication failed":
1. Check your `server/.env` file for `DATABASE_URL`
2. The format is: `postgresql://username:password@host:port/database_name`
3. Use those exact credentials in the psql command

