const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // IMPORTANT: Only delete sample/test data, NOT real user data!
  // Only delete data that is clearly seed/test data (identified by specific emails or test patterns)
  
  // Delete sample/test users only (by email pattern or specific test emails)
  const testUserEmails = ['john@example.com', 'sarah@example.com', 'michael@example.com', 'admin@10xcoach.ai'];
  for (const email of testUserEmails) {
    await prisma.user.deleteMany({
      where: { email: email }
    });
  }

  // Delete related data for test users only (these will cascade or we can handle manually)
  // Note: Only delete test data, preserve real user data

  // Clear seed data tables (coaches, plans, quizzes, etc.) - these are reference data
  // IMPORTANT: Clear in order to respect foreign key constraints
  
  // First, clear dependent data
  await prisma.actionStep.deleteMany();
  await prisma.session.deleteMany();
  await prisma.todo.deleteMany();
  await prisma.note.deleteMany();
  await prisma.huddle.deleteMany();
  await prisma.quizResult.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quizTemplate.deleteMany();
  await prisma.quiz.deleteMany();
  
  // Clear users' references to coaches before deleting coaches
  await prisma.user.updateMany({
    where: {
      primaryCoachId: { not: null }
    },
    data: {
      primaryCoachId: null
    }
  });
  
  // Now safe to delete coaches
  await prisma.coach.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.adminSettings.deleteMany();
  
  // Only delete blog posts if we want to re-seed them (using upsert instead)
  // await prisma.blogPost.deleteMany();

  console.log('✅ Cleared seed data (preserving real user data)');

  // Create Plans
  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        name: 'Foundation',
        tier: 'FOUNDATION',
        price: 39,
        yearlyPrice: 29,
        featuresJson: JSON.stringify({
          features: [
            'Access to 10 business coach modules',
            'Access to unlimited Business Health Assessments',
            'Written and oral quizzes',
            'Community forum'
          ]
        }),
        maxMinutes: null,
        active: true
      }
    }),
    prisma.plan.create({
      data: {
        name: 'Momentum',
        tier: 'MOMENTUM',
        price: 99,
        yearlyPrice: 74,
        featuresJson: JSON.stringify({
          features: [
            'ALL Foundation +',
            'Verbal AI exams',
            'Live webinars',
            'AI scoring reports'
          ]
        }),
        maxMinutes: 120,
        active: true
      }
    }),
    prisma.plan.create({
      data: {
        name: 'Elite/Exit',
        tier: 'ELITE',
        price: 299,
        yearlyPrice: 224,
        featuresJson: JSON.stringify({
          features: [
            'All Momentum features +',
            '1:1 coaching (monthly)',
            'Exit readiness workshop'
          ]
        }),
        maxMinutes: null,
        active: true
      }
    })
  ]);

  console.log('✅ Created plans');

  // Create Coaches
  const coaches = await Promise.all([
    prisma.coach.create({
      data: {
        name: 'Alan Wozniak',
        email: 'alan@10xcoach.ai',
        role: 'STRATEGY',
        specialty: 'Business Strategy & Problem Solving',
        description: 'Strategic business coaching focused on mission alignment and market fit.',
        tagline: 'Align your mission. Solve problems before they cost momentum.',
        avatar: '/avatars/Alan-Wozniak-CEC.jpg',
        active: true,
        personaJson: JSON.stringify({
          tone: 'professional',
          expertise: ['strategy', 'problem-solving', 'business planning']
        })
      }
    }),
    prisma.coach.create({
      data: {
        name: 'Rob Mercer',
        email: 'rob@10xcoach.ai',
        role: 'SALES',
        specialty: 'Sales',
        description: 'Build repeatable, scalable sales processes.',
        tagline: 'Practice in AI-powered simulations. Close with confidence.',
        avatar: '/avatars/Robertini-Rob-Mercer.jpg',
        active: true,
        personaJson: JSON.stringify({
          tone: 'energetic',
          expertise: ['sales', 'negotiation', 'closing']
        })
      }
    }),
    prisma.coach.create({
      data: {
        name: 'Teresa Lane',
        email: 'teresa@10xcoach.ai',
        role: 'MARKETING',
        specialty: 'Marketing',
        description: 'Learn to position, target, and attract with data-backed campaigns.',
        tagline: 'Align with customer intent. Drive growth through strategy.',
        avatar: '/avatars/Teresa-Lane.jpg',
        active: true,
        personaJson: JSON.stringify({
          tone: 'creative',
          expertise: ['marketing', 'positioning', 'campaigns']
        })
      }
    }),
    prisma.coach.create({
      data: {
        name: 'Jeffrey Wells',
        email: 'jeffrey@10xcoach.ai',
        role: 'OPERATIONS',
        specialty: 'Operations',
        description: 'Optimize internal processes. Streamline workflows.',
        tagline: 'Boost productivity and reduce cost through operational excellence.',
        avatar: '/avatars/Jeffrey-Wells.jpg',
        active: true,
        personaJson: JSON.stringify({
          tone: 'methodical',
          expertise: ['operations', 'process improvement', 'efficiency']
        })
      }
    }),
    prisma.coach.create({
      data: {
        name: 'Hudson Jaxon',
        email: 'hudson@10xcoach.ai',
        role: 'FINANCE',
        specialty: 'Finances',
        description: 'Master financial planning, KPIs, and strategic investment.',
        tagline: 'Guided fiscal modeling and risk management.',
        avatar: '/avatars/Hudson-Jaxson.jpg',
        active: true,
        personaJson: JSON.stringify({
          tone: 'analytical',
          expertise: ['finance', 'KPIs', 'investment']
        })
      }
    }),
    prisma.coach.create({
      data: {
        name: 'Chelsea Fox',
        email: 'chelsea@10xcoach.ai',
        role: 'CULTURE',
        specialty: 'Culture',
        description: 'Create a values-driven team. Foster engagement and innovation.',
        tagline: 'Build collaboration across departments.',
        avatar: '/avatars/Chelsea-Fox.jpg',
        active: true,
        personaJson: JSON.stringify({
          tone: 'warm',
          expertise: ['culture', 'team building', 'engagement']
        })
      }
    }),
    prisma.coach.create({
      data: {
        name: 'Camille Quinn',
        email: 'camille@10xcoach.ai',
        role: 'CUSTOMER_CENTRICITY',
        specialty: 'Customer Centricity',
        description: 'Design every experience around the customer.',
        tagline: 'Turn satisfaction into loyalty, and loyalty into referrals.',
        avatar: '/avatars/Camille-Quinn.jpg',
        active: true,
        personaJson: JSON.stringify({
          tone: 'empathetic',
          expertise: ['customer experience', 'retention', 'satisfaction']
        })
      }
    }),
    prisma.coach.create({
      data: {
        name: 'Tanner Chase',
        email: 'tanner@10xcoach.ai',
        role: 'EXIT_STRATEGY',
        specialty: 'BIG EXIT Strategy',
        description: "Plan your ultimate exit from Day 1.",
        tagline: "Whether it's succession or acquisition, build for the exit.",
        avatar: '/avatars/Tanner-Chase.jpg',
        active: true,
        personaJson: JSON.stringify({
          tone: 'visionary',
          expertise: ['exit planning', 'succession', 'acquisition']
        })
      }
    })
  ]);

  console.log('✅ Created coaches');

  // Create 10X Business Health Quiz Template and Questions
  const quizTemplate = await prisma.quizTemplate.create({
    data: {
      name: '10X Business Health Quiz',
      description: 'Comprehensive assessment of your business across 8 key pillars: Strategy, Finance, Marketing, Sales, Operations, Culture, Customer Experience, and Exit Strategy.',
      active: true
    }
  });

  // Quiz questions for each pillar (5 questions per pillar = 40 total)
  const quizQuestions = [
    // STRATEGY Pillar
    { text: 'How clear is your long-term vision for your business?', type: 'SCALE', pillarTag: 'STRATEGY', weight: 1.2, order: 1 },
    { text: 'How well-defined is your competitive advantage?', type: 'SCALE', pillarTag: 'STRATEGY', weight: 1.0, order: 2 },
    { text: 'How effective is your strategic planning process?', type: 'SCALE', pillarTag: 'STRATEGY', weight: 1.1, order: 3 },
    { text: 'How well do you understand your target market?', type: 'SCALE', pillarTag: 'STRATEGY', weight: 1.0, order: 4 },
    { text: 'How aligned are your team members with your business goals?', type: 'SCALE', pillarTag: 'STRATEGY', weight: 1.0, order: 5 },
    
    // FINANCE Pillar
    { text: 'How healthy is your cash flow?', type: 'SCALE', pillarTag: 'FINANCE', weight: 1.3, order: 1 },
    { text: 'How well do you track and manage your financial metrics?', type: 'SCALE', pillarTag: 'FINANCE', weight: 1.1, order: 2 },
    { text: 'How prepared are you for financial forecasting and budgeting?', type: 'SCALE', pillarTag: 'FINANCE', weight: 1.0, order: 3 },
    { text: 'How effectively do you manage business expenses?', type: 'SCALE', pillarTag: 'FINANCE', weight: 1.0, order: 4 },
    { text: 'How well do you understand your profit margins?', type: 'SCALE', pillarTag: 'FINANCE', weight: 1.1, order: 5 },
    
    // MARKETING Pillar
    { text: 'How strong is your brand identity and positioning?', type: 'SCALE', pillarTag: 'MARKETING', weight: 1.1, order: 1 },
    { text: 'How effective is your marketing strategy?', type: 'SCALE', pillarTag: 'MARKETING', weight: 1.2, order: 2 },
    { text: 'How well do you understand your target audience?', type: 'SCALE', pillarTag: 'MARKETING', weight: 1.0, order: 3 },
    { text: 'How effective are your marketing channels?', type: 'SCALE', pillarTag: 'MARKETING', weight: 1.0, order: 4 },
    { text: 'How well do you measure marketing ROI?', type: 'SCALE', pillarTag: 'MARKETING', weight: 1.0, order: 5 },
    
    // SALES Pillar
    { text: 'How effective is your sales process?', type: 'SCALE', pillarTag: 'SALES', weight: 1.2, order: 1 },
    { text: 'How well does your sales team perform?', type: 'SCALE', pillarTag: 'SALES', weight: 1.1, order: 2 },
    { text: 'How strong is your sales pipeline?', type: 'SCALE', pillarTag: 'SALES', weight: 1.1, order: 3 },
    { text: 'How well do you handle sales objections?', type: 'SCALE', pillarTag: 'SALES', weight: 1.0, order: 4 },
    { text: 'How effective is your customer retention strategy?', type: 'SCALE', pillarTag: 'SALES', weight: 1.0, order: 5 },
    
    // OPERATIONS Pillar
    { text: 'How efficient are your business operations?', type: 'SCALE', pillarTag: 'OPERATIONS', weight: 1.2, order: 1 },
    { text: 'How well do you manage your supply chain?', type: 'SCALE', pillarTag: 'OPERATIONS', weight: 1.0, order: 2 },
    { text: 'How effective are your quality control processes?', type: 'SCALE', pillarTag: 'OPERATIONS', weight: 1.0, order: 3 },
    { text: 'How well do you leverage technology and automation?', type: 'SCALE', pillarTag: 'OPERATIONS', weight: 1.1, order: 4 },
    { text: 'How scalable are your current operations?', type: 'SCALE', pillarTag: 'OPERATIONS', weight: 1.1, order: 5 },
    
    // CULTURE Pillar
    { text: 'How strong is your company culture?', type: 'SCALE', pillarTag: 'CULTURE', weight: 1.2, order: 1 },
    { text: 'How well do you attract and retain top talent?', type: 'SCALE', pillarTag: 'CULTURE', weight: 1.1, order: 2 },
    { text: 'How effective is your team communication?', type: 'SCALE', pillarTag: 'CULTURE', weight: 1.0, order: 3 },
    { text: 'How well do you develop and train your employees?', type: 'SCALE', pillarTag: 'CULTURE', weight: 1.0, order: 4 },
    { text: 'How aligned are your values with your business practices?', type: 'SCALE', pillarTag: 'CULTURE', weight: 1.0, order: 5 },
    
    // CUSTOMER_CENTRICITY Pillar
    { text: 'How well do you understand your customers\' needs?', type: 'SCALE', pillarTag: 'CUSTOMER_CENTRICITY', weight: 1.2, order: 1 },
    { text: 'How effective is your customer service?', type: 'SCALE', pillarTag: 'CUSTOMER_CENTRICITY', weight: 1.2, order: 2 },
    { text: 'How well do you collect and act on customer feedback?', type: 'SCALE', pillarTag: 'CUSTOMER_CENTRICITY', weight: 1.0, order: 3 },
    { text: 'How strong is your customer loyalty?', type: 'SCALE', pillarTag: 'CUSTOMER_CENTRICITY', weight: 1.1, order: 4 },
    { text: 'How well do you personalize the customer experience?', type: 'SCALE', pillarTag: 'CUSTOMER_CENTRICITY', weight: 1.0, order: 5 },
    
    // EXIT_STRATEGY Pillar
    { text: 'How clear is your exit strategy?', type: 'SCALE', pillarTag: 'EXIT_STRATEGY', weight: 1.3, order: 1 },
    { text: 'How well-positioned is your business for acquisition?', type: 'SCALE', pillarTag: 'EXIT_STRATEGY', weight: 1.2, order: 2 },
    { text: 'How well-documented are your business processes?', type: 'SCALE', pillarTag: 'EXIT_STRATEGY', weight: 1.0, order: 3 },
    { text: 'How independent is your business from you as the owner?', type: 'SCALE', pillarTag: 'EXIT_STRATEGY', weight: 1.1, order: 4 },
    { text: 'How attractive is your business to potential buyers?', type: 'SCALE', pillarTag: 'EXIT_STRATEGY', weight: 1.2, order: 5 }
  ];

  await prisma.quizQuestion.createMany({
    data: quizQuestions.map(q => ({
      quizId: quizTemplate.id,
      ...q
    }))
  });

  console.log('✅ Created 10X Business Health Quiz with 40 questions');

  // Create/Update Admin User (using upsert to avoid duplicates)
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@10xcoach.ai' },
    update: {
      // Only update password if it doesn't exist, preserve other data
      passwordHash: adminPassword
    },
    create: {
      name: 'Admin User',
      email: 'admin@10xcoach.ai',
      passwordHash: adminPassword,
      role: 'ADMIN',
      plan: 'ELITE',
      status: 'ACTIVE',
      businessName: '10XCoach.ai',
      industry: 'Technology'
    }
  });

  console.log('✅ Created/Updated admin user (email: admin@10xcoach.ai, password: admin123)');

  // Create Sample Users
  const userPassword = await bcrypt.hash('user123', 12);
  const sampleUsers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'John Smith',
        email: 'john@example.com',
        passwordHash: userPassword,
        role: 'USER',
        plan: 'MOMENTUM',
        status: 'ACTIVE',
        businessName: 'Smith Consulting',
        industry: 'Professional Services',
        primaryCoachId: coaches[0].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        passwordHash: userPassword,
        role: 'USER',
        plan: 'FOUNDATION',
        status: 'TRIAL',
        businessName: 'Johnson Tech',
        industry: 'Technology',
        primaryCoachId: coaches[1].id
      }
    }),
    prisma.user.create({
      data: {
        name: 'Michael Chen',
        email: 'michael@example.com',
        passwordHash: userPassword,
        role: 'USER',
        plan: 'ELITE',
        status: 'ACTIVE',
        businessName: 'Chen Enterprises',
        industry: 'Manufacturing',
        primaryCoachId: coaches[4].id
      }
    })
  ]);

  console.log('✅ Created sample users');

  // Create Sample Sessions
  const sessions = await Promise.all([
    prisma.session.create({
      data: {
        userId: sampleUsers[0].id,
        coachId: coaches[0].id,
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        duration: 30,
        status: 'COMPLETED',
        summary: 'Discussed business strategy and market positioning.'
      }
    }),
    prisma.session.create({
      data: {
        userId: sampleUsers[1].id,
        coachId: coaches[1].id,
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        duration: 45,
        status: 'COMPLETED',
        summary: 'Sales pipeline review and optimization strategies.'
      }
    })
  ]);

  console.log('✅ Created sample sessions');

  // Create Sample Action Steps
  await Promise.all([
    prisma.actionStep.create({
      data: {
        userId: sampleUsers[0].id,
        sessionId: sessions[0].id,
        description: 'Complete market analysis for Q1',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        priority: 'HIGH'
      }
    }),
    prisma.actionStep.create({
      data: {
        userId: sampleUsers[0].id,
        sessionId: sessions[0].id,
        description: 'Review competitor pricing strategies',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        priority: 'MEDIUM'
      }
    }),
    prisma.actionStep.create({
      data: {
        userId: sampleUsers[1].id,
        sessionId: sessions[1].id,
        description: 'Create sales presentation deck',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
        priority: 'HIGH'
      }
    })
  ]);

  console.log('✅ Created sample action steps');

  // Create Admin Settings
  await Promise.all([
    prisma.adminSettings.create({
      data: { key: 'enableRegistration', value: JSON.stringify(true) }
    }),
    prisma.adminSettings.create({
      data: { key: 'enableTrialPeriod', value: JSON.stringify(true) }
    }),
    prisma.adminSettings.create({
      data: { key: 'trialDays', value: JSON.stringify(14) }
    }),
    prisma.adminSettings.create({
      data: { key: 'maintenanceMode', value: JSON.stringify(false) }
    })
  ]);

  console.log('✅ Created admin settings');

  // =============================================
  // SEED BLOG POSTS
  // =============================================
  console.log('📝 Seeding blog posts...');
  
  const blogPosts = [
    {
      title: 'Jesus: The Perfect Life from Womb to Tomb',
      excerpt: 'Exploring the profound journey of Jesus Christ and the timeless lessons His life offers.',
      category: 'Spirituality',
      author: 'Alan Wozniak',
      date: 'November 24, 2025',
      readTime: '8 min read',
      image: '/blogs/1.png',
      content: `Did you know that the single most influential life ever lived began in a quiet manger in Bethlehem over 2,000 years ago? Whether you're a lifelong believer or just curious about Jesus' story, His journey from womb to tomb—and beyond—is one of the most extraordinary narratives in all of history. And it still speaks to us today with a message of hope, grace, and forgiveness.

Let's walk through it together.

## A Miraculous Beginning

Let's start at the very beginning. Jesus' birth wasn't just unusual—it was miraculous. Born of the Virgin Mary, His arrival fulfilled centuries-old prophecies and signaled that God was doing something incredible. We often hear the Christmas story so often that it becomes familiar, but imagine it from Mary's perspective for a moment.

A young woman, visited by an angel, told she would carry the Son of God.

A divine calling wrapped in both wonder and fear.

And yet, despite the weight of it all, Mary said yes. Because of her faith and obedience, the world received the Savior, the One who would change everything.

## A Life Lived in Pure Love

Fast-forward into Jesus' life, and what stands out most is how He lived—perfectly, purposefully, and passionately. Not "perfect" in the sense of being distant or unreachable, but in a way that modeled what love really looks like in action.

He wasn't afraid to get close to people others ignored. He sat with the broken, healed the hurting, and spoke life into those who felt unworthy.

Think about the woman caught in adultery. Everyone else wanted to condemn her, but Jesus chose compassion over judgment (John 8:1–11). He offered forgiveness and a fresh start—something we all long for.

Throughout His ministry:

He healed the sick

He opened blind eyes

He calmed storms

He raised the dead

He restored dignity to the forgotten

These miracles weren't magic tricks. They were expressions of His heart—a heart overflowing with compassion for humanity.

He didn't just preach love… He lived it every single day.

## The Ultimate Sacrifice

But Jesus' mission wasn't only about living a flawless life. It was about giving His life.

From the beginning, His story was headed toward the cross.

The crucifixion wasn't a spontaneous moment of tragedy; it was part of a divine plan formed from the foundations of the world. Jesus willingly stepped into the role of sacrifice so that you and I could be restored to God.

Picture that moment at Calvary:

Jesus, beaten and bruised, hangs on a cross—not because He had done anything wrong, but because He chose to take on the weight of the world's sin.

Humiliation. Pain. Separation.

And He endured it because of love—real, self-sacrificing love.

God gave His only Son so that we could experience forgiveness and everlasting life. It's a gift so immense that it leaves most of us humbled every time we reflect on it.

## The Tomb… and the Triumph

After His death, Jesus was placed in a tomb—a moment that seemed to silence hope.

But only for a little while.

Three days later, everything changed.

The stone rolled away. The tomb was empty. Jesus rose from the dead, defeating sin and death once and for all. This moment is the heartbeat of Christianity. Without the resurrection, there is no hope. But because He lives, we can face anything.

Think about Mary Magdalene arriving at the tomb. She expected to find Jesus' body, but instead she found something far greater—life. When she encountered the risen Christ, her sorrow instantly turned to joy (John 20:11–18). Her story reminds us that even when we feel lost or overwhelmed, God can bring hope into the darkest places.

The resurrection is more than a historical event—it's a promise. A promise that death does not have the final say. A promise that we too can experience new life.

## Forgiveness, Grace, and Hope for Today

So, what does Jesus' perfect life mean for us right now?

For starters, it means real forgiveness. Not temporary relief. Not partial acceptance. Real, unconditional forgiveness.

No matter how far we've wandered or how badly we think we've messed up, His grace covers it all. We don't have to earn God's love—Jesus already paid the price.

Grace is not a concept. It's an anchor. It's the reassurance that, even in our brokenness, God welcomes us with open arms.

And then there's hope—steady, unshakable hope. A hope that whispers, "You are not alone." A hope that sits with us through our struggles, worries, and uncertainties. A hope that lifts our eyes beyond the present moment to something greater.

## Living the Message

As we reflect on Jesus' life—from womb to tomb—it's natural to ask, What does this mean for my life?

His story calls us to reflect His love:

To show grace instead of judgment

To extend kindness even when it's not easy

To live with purpose instead of drifting

To be lights in a world that desperately needs hope

It's so easy to rush through life and lose sight of what really matters. Jesus' life invites us to slow down and reconsider our priorities—to live intentionally, compassionately, and courageously.

## A Perfect Life That Changes Ours

Jesus' journey is a breathtaking tapestry of love, sacrifice, and victory. From His miraculous birth to His sinless life, from His heartbreaking death to His triumphant resurrection—every moment was woven together for our redemption.

We can walk confidently through life knowing that because of Him, we have forgiveness, grace, and everlasting hope.

His story changes our story.

What part of Jesus' life speaks to you the most?

I'd love to hear your thoughts—let's talk about it.

https://marketwellsolutions.com/jesus-the-perfect-life-from-womb-to-tomb`,
      order: 1
    },
    {
      title: 'Top 10 Perplexity AI Prompts to Supercharge Your Business Research',
      excerpt: 'Discover powerful AI prompts that will transform how you conduct business research and gather insights.',
      category: 'AI & Technology',
      author: '10X Team',
      date: 'Dec 12, 2024',
      readTime: '6 min read',
      image: '/blogs/2.png',
      order: 2
    },
    {
      title: 'From Broke to Billionaire: The Ray Kroc Story',
      excerpt: 'The incredible journey of Ray Kroc and how he built McDonald\'s into a global empire.',
      category: 'Success Stories',
      author: '10X Team',
      date: 'Dec 10, 2024',
      readTime: '7 min read',
      image: '/blogs/3.png',
      order: 3
    },
    {
      title: 'When Life Squeezes You, What Comes Out of You: The Orange Analogy',
      excerpt: 'Understanding how pressure reveals your true character and what you\'re really made of.',
      category: 'Personal Development',
      author: '10X Team',
      date: 'Dec 8, 2024',
      readTime: '5 min read',
      image: '/blogs/4.png',
      order: 4
    },
    {
      title: 'The Boiling Frog Theory: How Small Problems Quietly Boil Your Business',
      excerpt: 'Learn to recognize gradual decline before it\'s too late and take action to prevent business failure.',
      category: 'Strategy',
      author: '10X Team',
      date: 'Dec 5, 2024',
      readTime: '6 min read',
      image: '/blogs/5.png',
      order: 5
    },
    {
      title: 'From GOAT to "God of All Things": A Modern Reminder of Who Truly Deserves the Glory',
      excerpt: 'A reflection on humility, recognition, and giving proper credit where it\'s due.',
      category: 'Faith & Leadership',
      author: '10X Team',
      date: 'Dec 3, 2024',
      readTime: '7 min read',
      image: '/blogs/6.png',
      order: 6
    },
    {
      title: '3 Foundational Lessons for Lasting Success',
      excerpt: 'Core principles that form the foundation of sustainable business and personal success.',
      category: 'Business Fundamentals',
      author: '10X Team',
      date: 'Dec 1, 2024',
      readTime: '8 min read',
      image: '/blogs/7.png',
      order: 7
    },
    {
      title: 'Customer Centricity Rules: The Chick-fil-A Way',
      excerpt: 'How Chick-fil-A built a cult-like following through exceptional customer service and values.',
      category: 'Customer Experience',
      author: '10X Team',
      date: 'Nov 28, 2024',
      readTime: '6 min read',
      image: '/blogs/8.png',
      order: 8
    },
    {
      title: 'How the Government and Businesses Mislead You with Statistics: The Case of Relative Risk vs. Absolute Risk in COVID Vaccines',
      excerpt: 'Understanding how statistics can be manipulated and learning to see through the numbers.',
      category: 'Critical Thinking',
      author: '10X Team',
      date: 'Nov 25, 2024',
      readTime: '9 min read',
      image: '/blogs/9.png',
      order: 9
    },
    {
      title: 'Unleashing Potential: The Power of SWOT Analysis',
      excerpt: 'Master the SWOT framework to identify opportunities, threats, and strategic advantages.',
      category: 'Strategy',
      author: '10X Team',
      date: 'Nov 22, 2024',
      readTime: '7 min read',
      image: '/blogs/10.png',
      order: 10
    },
    {
      title: 'Selling the Island: Transforming Your Approach to Connection and Sales',
      excerpt: 'Revolutionary sales techniques that focus on building genuine connections over transactions.',
      category: 'Sales',
      author: '10X Team',
      date: 'Nov 20, 2024',
      readTime: '6 min read',
      image: '/blogs/11.png',
      order: 11
    },
    {
      title: 'The Price of Elevation: What You Must Lose to Rise',
      excerpt: 'Understanding the sacrifices and changes necessary for true growth and elevation.',
      category: 'Personal Development',
      author: '10X Team',
      date: 'Nov 18, 2024',
      readTime: '5 min read',
      image: '/blogs/12.png',
      order: 12
    },
    {
      title: 'Empowering Entrepreneurs: The Impact of Franchising on Local Economies',
      excerpt: 'How franchising creates opportunities and drives economic growth in communities.',
      category: 'Entrepreneurship',
      author: '10X Team',
      date: 'Nov 15, 2024',
      readTime: '7 min read',
      image: '/blogs/13.png',
      order: 13
    },
    {
      title: 'McDonald\'s vs. Chick-fil-A: What Businesses Can Learn About Growth, Loyalty, and Scale',
      excerpt: 'A comparative analysis of two fast-food giants and the lessons for modern businesses.',
      category: 'Business Strategy',
      author: '10X Team',
      date: 'Nov 12, 2024',
      readTime: '8 min read',
      image: '/blogs/14.png',
      order: 14
    },
    {
      title: 'Understanding OKRs, KPIs, and CSFs: Your Roadmap to Business Success',
      excerpt: 'Master these essential business frameworks to set goals, measure progress, and achieve success.',
      category: 'Business Metrics',
      author: '10X Team',
      date: 'Nov 10, 2024',
      readTime: '9 min read',
      image: '/blogs/15.png',
      order: 15
    },
    {
      title: 'Navigating the Storm – Facing the Reality: I Was There When It Sucked',
      excerpt: 'A raw, honest account of facing business challenges and coming out stronger on the other side.',
      category: 'Resilience',
      author: '10X Team',
      date: 'Nov 8, 2024',
      readTime: '6 min read',
      image: '/blogs/16.png',
      order: 16
    },
    {
      title: 'A Turning Point in History: Reflecting on the Legacy of Charlie Kirk',
      excerpt: 'Examining the impact and influence of a modern thought leader on business and culture.',
      category: 'Leadership',
      author: '10X Team',
      date: 'Nov 5, 2024',
      readTime: '7 min read',
      image: '/blogs/17.png',
      order: 17
    },
    {
      title: 'Was the Cracker Barrel Name Change Sheer Stupidity or Pure Brilliance?',
      excerpt: 'Analyzing a controversial rebranding decision and what it teaches us about business strategy.',
      category: 'Branding',
      author: '10X Team',
      date: 'Nov 3, 2024',
      readTime: '5 min read',
      image: '/blogs/18.png',
      order: 18
    }
  ];

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { id: post.order },
      update: {
        title: post.title,
        excerpt: post.excerpt || null,
        category: post.category || null,
        author: post.author || null,
        date: post.date,
        readTime: post.readTime || null,
        image: post.image || null,
        content: post.content || null,
        published: true,
        order: post.order
      },
      create: {
        ...post,
        id: post.order,
        content: post.content || null
      }
    });
  }

  console.log(`✅ Seeded ${blogPosts.length} blog posts`);

  // Seed Pillars
  console.log('🌱 Seeding pillars...');
  await prisma.pillar.deleteMany();
  
  const defaultPillars = [
    { tag: 'STRATEGY', name: 'Strategy', icon: '🎯', color: '#3b82f6', description: 'Strategic planning and vision', order: 0 },
    { tag: 'FINANCE', name: 'Finance', icon: '💰', color: '#10b981', description: 'Financial health and management', order: 1 },
    { tag: 'MARKETING', name: 'Marketing', icon: '📢', color: '#f59e0b', description: 'Marketing effectiveness', order: 2 },
    { tag: 'SALES', name: 'Sales', icon: '💼', color: '#ef4444', description: 'Sales processes and performance', order: 3 },
    { tag: 'OPERATIONS', name: 'Operations', icon: '⚙️', color: '#8b5cf6', description: 'Operational efficiency', order: 4 },
    { tag: 'CULTURE', name: 'Culture', icon: '👥', color: '#ec4899', description: 'Organizational culture', order: 5 },
    { tag: 'CUSTOMER_CENTRICITY', name: 'Customer Experience', icon: '❤️', color: '#06b6d4', description: 'Customer satisfaction and experience', order: 6 },
    { tag: 'EXIT_STRATEGY', name: 'Exit Strategy', icon: '🚀', color: '#6366f1', description: 'Exit planning and strategy', order: 7 }
  ];

  for (const pillar of defaultPillars) {
    await prisma.pillar.upsert({
      where: { tag: pillar.tag },
      update: pillar,
      create: pillar
    });
  }
  console.log(`✅ Seeded ${defaultPillars.length} pillars`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('   Admin: admin@10xcoach.ai / admin123');
  console.log('   User:  john@example.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

