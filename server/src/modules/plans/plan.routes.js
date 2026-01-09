const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticate, requireAdmin } = require('../../middleware/auth.middleware');

// =============================================
// GET /api/plans
// Get all active plans (public)
// =============================================
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: 'asc' }
    });

    // If no plans exist, return default plans
    if (plans.length === 0) {
      return res.json([
        {
          id: 1,
          name: 'Foundation',
          tier: 'FOUNDATION',
          price: 69,
          yearlyPrice: null,
          featuresJson: {
            features: [
              '10X Action Step Framework',
              '10X Discovery Questions',
              '10X Coach Notetaking (session-based)',
              'Personal TO-DO List',
              'Calendar at-a-Glance',
              '10X Business Success Quizzes (limited frequency)'
            ],
            voiceHours: 2,
            coaches: ['Strategy Coach', 'Sales Coach'],
            restrictions: [
              'No team huddles',
              'No shared accountability',
              'No advanced dashboards'
            ],
            positioning: 'Your AI business coach for clarity, confidence, and next steps.',
            idealFor: 'Solo founders, early-stage businesses, and first-time AI coach users'
          },
          maxMinutes: 120,
          active: true
        },
        {
          id: 2,
          name: 'Execution',
          tier: 'EXECUTION',
          price: 179,
          yearlyPrice: null,
          featuresJson: {
            features: [
              'Unlimited 10X Action Steps',
              '10X 10-Minute Huddles (agenda → notes → actions)',
              'Shared TO-DO Lists (team accountability)',
              'Advanced 10X Coach Notetaking',
              'Calendar with execution overlays',
              'Full access to 10X Business Success Quizzes',
              'Weekly execution summaries',
              'Multiple users',
              'Shared visibility',
              'Role-based ownership'
            ],
            voiceHours: 4,
            coaches: ['Strategy Coach', 'Sales Coach', 'Marketing Coach', 'Operations Coach', 'Finance Coach', 'Culture Coach'],
            restrictions: [],
            positioning: 'Where strategy turns into disciplined execution.',
            idealFor: 'Growing teams, managers, consultants, and execution-focused leaders'
          },
          maxMinutes: 240,
          active: true
        },
        {
          id: 3,
          name: 'Scale',
          tier: 'SCALE',
          price: 399,
          yearlyPrice: null,
          featuresJson: {
            features: [
              'Cross-coach intelligence (Full)',
              'Long-term memory & pattern recognition',
              'Enterprise execution dashboards',
              'Multi-team and department huddles',
              'Long-term performance tracking',
              'Enterprise value & exit readiness scoring',
              'Customer experience maturity mapping',
              'Historical action intelligence',
              'Priority orchestration across departments',
              'Admin roles & permissions',
              'Execution audit trail',
              'Data export for investors/advisors',
              'Quarterly execution review (AI-Generated)'
            ],
            voiceHours: 8,
            coaches: ['Strategy Coach', 'Sales Coach', 'Marketing Coach', 'Operations Coach', 'Finance Coach', 'Culture Coach', 'Customer Centricity Coach', 'Exit Readiness Coach'],
            restrictions: [],
            positioning: 'Build a business that runs without you—and is valuable with or without you.',
            idealFor: 'Scaling companies, PE-backed firms, franchisors, and exit-minded owners'
          },
          maxMinutes: 480,
          active: true
        }
      ]);
    }

    // Define the new plan structure for each tier
    const newPlanStructure = {
      'FOUNDATION': {
        price: 69,
        yearlyPrice: null,
        maxMinutes: 120,
        featuresJson: {
          features: [
            '10X Action Step Framework',
            '10X Discovery Questions',
            '10X Coach Notetaking (session-based)',
            'Personal TO-DO List',
            'Calendar at-a-Glance',
            '10X Business Success Quizzes (limited frequency)'
          ],
          voiceHours: 2,
          coaches: ['Strategy Coach', 'Sales Coach'],
          restrictions: [
            'No team huddles',
            'No shared accountability',
            'No advanced dashboards'
          ],
          positioning: 'Your AI business coach for clarity, confidence, and next steps.',
          idealFor: 'Solo founders, early-stage businesses, and first-time AI coach users'
        }
      },
      'EXECUTION': {
        price: 179,
        yearlyPrice: null,
        maxMinutes: 240,
        featuresJson: {
          features: [
            'Unlimited 10X Action Steps',
            '10X 10-Minute Huddles (agenda → notes → actions)',
            'Shared TO-DO Lists (team accountability)',
            'Advanced 10X Coach Notetaking',
            'Calendar with execution overlays',
            'Full access to 10X Business Success Quizzes',
            'Weekly execution summaries',
            'Multiple users',
            'Shared visibility',
            'Role-based ownership'
          ],
          voiceHours: 4,
          coaches: ['Strategy Coach', 'Sales Coach', 'Marketing Coach', 'Operations Coach', 'Finance Coach', 'Culture Coach'],
          restrictions: [],
          positioning: 'Where strategy turns into disciplined execution.',
          idealFor: 'Growing teams, managers, consultants, and execution-focused leaders'
        }
      },
      'SCALE': {
        price: 399,
        yearlyPrice: null,
        maxMinutes: 480,
        featuresJson: {
          features: [
            'Cross-coach intelligence (Full)',
            'Long-term memory & pattern recognition',
            'Enterprise execution dashboards',
            'Multi-team and department huddles',
            'Long-term performance tracking',
            'Enterprise value & exit readiness scoring',
            'Customer experience maturity mapping',
            'Historical action intelligence',
            'Priority orchestration across departments',
            'Admin roles & permissions',
            'Execution audit trail',
            'Data export for investors/advisors',
            'Quarterly execution review (AI-Generated)'
          ],
          voiceHours: 8,
          coaches: ['Strategy Coach', 'Sales Coach', 'Marketing Coach', 'Operations Coach', 'Finance Coach', 'Culture Coach', 'Customer Centricity Coach', 'Exit Readiness Coach'],
          restrictions: [],
          positioning: 'Build a business that runs without you—and is valuable with or without you.',
          idealFor: 'Scaling companies, PE-backed firms, franchisors, and exit-minded owners'
        }
      }
    };

    // Map plan names to tier keys (handle old names like "Momentum", "Elite/Exit")
    // Use case-insensitive matching
    const nameToTierMap = {
      'foundation': 'FOUNDATION',
      'momentum': 'EXECUTION',
      'execution': 'EXECUTION',
      'elite': 'SCALE',
      'elite/exit': 'SCALE',
      'scale': 'SCALE'
    };

    // Update plans that have old pricing or structure
    const updatedPlans = [];
    for (const plan of plans) {
      const planNameLower = plan.name.trim().toLowerCase();
      const planNameOriginal = plan.name.trim();
      const tierKey = nameToTierMap[planNameLower] || plan.tier?.toUpperCase();
      
      if (tierKey && newPlanStructure[tierKey]) {
        const newStructure = newPlanStructure[tierKey];
        // Check if plan needs updating (old price or missing new fields)
        const needsUpdate = 
          Math.abs(plan.price - newStructure.price) > 0.01 || // Use floating point comparison
          plan.maxMinutes !== newStructure.maxMinutes ||
          !plan.featuresJson?.coaches ||
          !plan.featuresJson?.positioning ||
          !plan.featuresJson?.idealFor;

        if (needsUpdate) {
          try {
            console.log(`[PLAN UPDATE] Plan ${plan.id} "${planNameOriginal}" (tier: ${plan.tier}) -> Updating from price ${plan.price} to ${newStructure.price}, tierKey: ${tierKey}`);
            const updatedPlan = await prisma.plan.update({
              where: { id: plan.id },
              data: {
                price: newStructure.price,
                yearlyPrice: newStructure.yearlyPrice,
                maxMinutes: newStructure.maxMinutes,
                featuresJson: newStructure.featuresJson
              }
            });
            console.log(`[PLAN UPDATE SUCCESS] Plan ${plan.id} updated successfully`);
            updatedPlans.push(updatedPlan);
          } catch (error) {
            console.error(`[PLAN UPDATE ERROR] Error updating plan ${plan.id}:`, error);
            updatedPlans.push(plan); // Use old plan if update fails
          }
        } else {
          console.log(`[PLAN SKIP] Plan ${plan.id} "${planNameOriginal}" already has correct structure`);
          updatedPlans.push(plan);
        }
      } else {
        console.log(`[PLAN NO MATCH] Plan ${plan.id} "${planNameOriginal}" with tier "${plan.tier}" not matched. tierKey: ${tierKey}, Available keys: ${Object.keys(newPlanStructure).join(', ')}`);
        updatedPlans.push(plan); // Keep plan if name/tier not recognized
      }
    }

    res.json(updatedPlans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

// =============================================
// GET /api/plans/:id
// Get plan by ID
// =============================================
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

// =============================================
// POST /api/plans
// Create new plan (admin only)
// =============================================
router.post('/plans', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, tier, price, yearlyPrice, featuresJson, maxMinutes, active } = req.body;

    if (!name || !tier || price === undefined) {
      return res.status(400).json({ error: 'Name, tier, and price are required' });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        tier,
        price,
        yearlyPrice,
        featuresJson: featuresJson || { features: [] },
        maxMinutes,
        active: active !== false
      }
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error('Create plan error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Plan with this name or tier already exists' });
    }
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// =============================================
// PUT /api/plans/:id
// Update plan (admin only)
// =============================================
router.put('/plans/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, price, yearlyPrice, featuresJson, maxMinutes, active } = req.body;

    const plan = await prisma.plan.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(price !== undefined && { price }),
        ...(yearlyPrice !== undefined && { yearlyPrice }),
        ...(featuresJson && { featuresJson }),
        ...(maxMinutes !== undefined && { maxMinutes }),
        ...(active !== undefined && { active })
      }
    });

    res.json(plan);
  } catch (error) {
    console.error('Update plan error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// =============================================
// DELETE /api/plans/:id
// Delete plan (admin only)
// =============================================
router.delete('/plans/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.plan.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete plan error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

module.exports = router;

