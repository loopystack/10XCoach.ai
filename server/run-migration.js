const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running migration: alter_sessions_duration_to_decimal.sql');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'migrations', 'alter_sessions_duration_to_decimal.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 SQL to execute:');
    console.log(sql);

    // Execute the SQL
    await db.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('✅ duration column is now DECIMAL(5,2) to support fractional minutes');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart the main server (port 3001)');
    console.log('2. Restart openAI_conver (port 5000)');
    console.log('3. Test saving a conversation');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

runMigration();

