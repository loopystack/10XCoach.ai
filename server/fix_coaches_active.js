const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCoachesActive() {
  try {
    console.log('🔧 Fixing coaches active status...\n');

    // Update all coaches to be active
    const result = await prisma.coach.updateMany({
      where: {
        OR: [
          { active: false },
          { active: null }
        ]
      },
      data: {
        active: true
      }
    });

    console.log(`✅ Updated ${result.count} coaches to active: true\n`);

    // Verify the update
    const coaches = await prisma.coach.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        active: true
      },
      orderBy: { id: 'asc' }
    });

    console.log('📊 Current coaches status:');
    console.log('=====================================');
    coaches.forEach(coach => {
      const status = coach.active ? '✅ ACTIVE' : '❌ INACTIVE';
      console.log(`${coach.id}. ${coach.name} - ${status}`);
    });
    console.log('=====================================');
    console.log(`\nTotal coaches: ${coaches.length}`);
    console.log(`Active coaches: ${coaches.filter(c => c.active).length}`);
    console.log(`Inactive coaches: ${coaches.filter(c => !c.active).length}`);

    console.log('\n🎉 Fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing coaches active status:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixCoachesActive();

