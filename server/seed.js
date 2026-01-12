const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🚀 Starting database seeding...\n');

    // Insert Coaches
    console.log('👥 Inserting coaches...');
    const coaches = [
      {
        name: 'Alan Wozniak',
        email: 'alan@10xcoach.ai',
        role: 'STRATEGY',
        specialty: 'Business Strategy & Problem-Solving Coach',
        description: 'Confident visionary strategist bringing sharp clarity, decisive action steps, and uplifting intensity.',
        tagline: "Let's think bigger and move faster—with focus.",
        avatar: 'Alan-Wozniak-CEC.jpg',
        voiceId: 'alloy',
        active: true
      },
      {
        name: 'Rob Mercer',
        email: 'rob@10xcoach.ai',
        role: 'SALES',
        specialty: 'Sales Coach',
        description: 'Charismatic closer—smooth, gritty, high-confidence. Turns objections into opportunities.',
        tagline: 'Turn problems into conversions.',
        avatar: 'Robertini-Rob-Mercer.jpg',
        voiceId: 'echo',
        active: true
      },
      {
        name: 'Teresa Lane',
        email: 'teresa@10xcoach.ai',
        role: 'MARKETING',
        specialty: 'Marketing Coach',
        description: 'Persuasive, feminine creative who makes brands irresistible. Elegant, high-emotion, and deeply intuitive.',
        tagline: "Let's make your message magnetic.",
        avatar: 'Teresa-Lane.jpg',
        voiceId: 'alloy',
        active: true
      },
      {
        name: 'Camille Quinn',
        email: 'camille@10xcoach.ai',
        role: 'CUSTOMER_CENTRICITY',
        specialty: 'Customer Experience (CX) Coach',
        description: 'Luxury experience architect—poised, warm, and emotionally attuned. Builds brands people fall in love with.',
        tagline: 'Every touchpoint should feel unforgettable.',
        avatar: 'Camille-Quinn.jpg',
        voiceId: 'alloy',
        active: true
      },
      {
        name: 'Jeffrey Wells',
        email: 'jeffrey@10xcoach.ai',
        role: 'OPERATIONS',
        specialty: 'Operations Coach',
        description: 'Tactical powerhouse—disciplined, structured, and efficiency-driven. Makes complexity feel simple.',
        tagline: 'We build businesses that run without you.',
        avatar: 'Jeffrey-Wells.jpg',
        voiceId: 'onyx',
        active: true
      },
      {
        name: 'Chelsea Fox',
        email: 'chelsea@10xcoach.ai',
        role: 'CULTURE',
        specialty: 'Culture / HR Coach',
        description: 'Blends feminine authority with compassion. Helps leaders grow, teams align, and cultures evolve with purpose.',
        tagline: "Culture isn't what you say—it's what you build.",
        avatar: 'Chelsea-Fox.jpg',
        voiceId: 'alloy',
        active: true
      },
      {
        name: 'Hudson Jaxon',
        email: 'hudson@10xcoach.ai',
        role: 'FINANCE',
        specialty: 'Finance Coach',
        description: 'Boardroom presence—sharp, intentional, and investor-minded. Sees numbers like a strategist sees a chessboard.',
        tagline: 'Profit is power.',
        avatar: 'Hudson-Jaxson.jpg',
        voiceId: 'alloy',
        active: true
      },
      {
        name: 'Tanner Chase',
        email: 'tanner@10xcoach.ai',
        role: 'EXIT_STRATEGY',
        specialty: 'Business Value & BIG EXIT Coach',
        description: 'Calm, authoritative, and future-focused. Speaks like a seasoned M&A advisor building legacy-level companies.',
        tagline: "We don't just grow companies—we build buyable ones.",
        avatar: 'Tanner-Chase.jpg',
        voiceId: 'alloy',
        active: true
      }
    ];

    for (const coach of coaches) {
      await prisma.coach.create({ data: coach });
    }
    console.log(`✅ Inserted ${coaches.length} coaches!\n`);

    console.log('🎉 Database seeded successfully!');
    console.log('=====================================');
    console.log('Summary:');
    console.log(`  - Coaches: ${coaches.length}`);
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();

