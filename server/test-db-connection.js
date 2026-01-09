const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing PostgreSQL database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Count users
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);
    
    // Get a few sample users
    const sampleUsers = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    console.log('\n📋 Sample users:');
    sampleUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    await prisma.$disconnect();
    console.log('\n✅ Connection test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection error:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'P1001') {
      console.error('\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL is correct in .env');
    } else if (error.code === 'P1000') {
      console.error('\n💡 Tip: Check your database credentials in DATABASE_URL');
    }
    
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();

