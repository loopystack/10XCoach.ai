const db = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running migration: add_user_role_enum_values.sql');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/add_user_role_enum_values.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
        try {
          await db.query(statement);
          console.log('✅ Success');
        } catch (error) {
          // If the enum value already exists, that's okay
          if (error.message.includes('already exists') || error.code === '42710') {
            console.log('ℹ️  Enum value already exists, skipping...');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();

