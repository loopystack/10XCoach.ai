#!/bin/bash
# Script to add CHIEF_OF_STAFF to CoachRole enum
# Run this from the server directory

# Get database connection details from .env
if [ -f .env ]; then
    source .env
    # Extract connection details from DATABASE_URL
    # Format: postgresql://user:password@host:port/database
    DB_URL=${DATABASE_URL#postgresql://}
    DB_USER=$(echo $DB_URL | cut -d':' -f1)
    DB_PASS=$(echo $DB_URL | cut -d':' -f2 | cut -d'@' -f1)
    DB_HOST=$(echo $DB_URL | cut -d'@' -f2 | cut -d':' -f1)
    DB_PORT=$(echo $DB_URL | cut -d':' -f3 | cut -d'/' -f1)
    DB_NAME=$(echo $DB_URL | cut -d'/' -f2)
    
    echo "Adding CHIEF_OF_STAFF to CoachRole enum..."
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME -c "ALTER TYPE \"CoachRole\" ADD VALUE IF NOT EXISTS 'CHIEF_OF_STAFF';"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added CHIEF_OF_STAFF to enum"
        echo "Now run: npx prisma generate && node prisma/seed.js"
    else
        echo "❌ Failed to add enum value"
    fi
else
    echo "❌ .env file not found. Please run this from the server directory."
fi

