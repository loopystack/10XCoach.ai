// Script to help configure PostgreSQL database connection
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function configureDatabase() {
  console.log('🔧 PostgreSQL Database Configuration Setup\n');
  console.log('Please provide your PostgreSQL connection details:\n');

  const host = await question('Database Host [localhost]: ') || 'localhost';
  const port = await question('Database Port [5432]: ') || '5432';
  const database = await question('Database Name [10x_dashboard]: ') || '10x_dashboard';
  const user = await question('Database User [postgres]: ') || 'postgres';
  const password = await question('Database Password: ');

  const databaseUrl = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

  console.log('\n📝 Updating .env file...');

  // Read existing .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add DATABASE_URL
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL="${databaseUrl}"`);
  } else {
    envContent += `\nDATABASE_URL="${databaseUrl}"\n`;
  }

  // Also add individual variables for compatibility
  const dbVars = {
    DB_HOST: host,
    DB_PORT: port,
    DB_NAME: database,
    DB_USER: user,
    DB_PASSWORD: password
  };

  Object.entries(dbVars).forEach(([key, value]) => {
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
    } else {
      envContent += `${key}=${value}\n`;
    }
  });

  fs.writeFileSync(envPath, envContent);

  console.log('✅ .env file updated successfully!\n');
  console.log('Testing connection...\n');

  // Test connection
  process.env.DATABASE_URL = databaseUrl;
  process.env.DB_HOST = host;
  process.env.DB_PORT = port;
  process.env.DB_NAME = database;
  process.env.DB_USER = user;
  process.env.DB_PASSWORD = password;

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in the database\n`);

    if (userCount > 0) {
      const sampleUsers = await prisma.user.findMany({
        take: 3,
        select: { id: true, name: true, email: true, role: true }
      });
      console.log('Sample users:');
      sampleUsers.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));
    }

    await prisma.$disconnect();
    console.log('\n🎉 Configuration complete!');
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nPlease check your credentials and try again.');
    process.exit(1);
  } finally {
    rl.close();
  }
}

configureDatabase();

