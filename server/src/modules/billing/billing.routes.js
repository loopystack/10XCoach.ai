/**
 * Billing & Subscription Routes
 * Handles Stripe payments, credit management, and plan activation
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticate, requireAdmin } = require('../../middleware/auth.middleware');
const { requireAccess, checkUserAccess } = require('../../middleware/access.middleware');
const { createCheckoutSession, getOrCreateCustomer, stripe, STRIPE_PUBLISHABLE_KEY } = require('../../lib/stripe');

// =============================================
// GET /api/billing/status
// Get user's billing status (trial, plan, credit)
// =============================================
router.get('/billing/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        trialStartDate: true,
        trialEndDate: true,
        accessStatus: true,
        currentPlanName: true,
        planStartDate: true,
        planEndDate: true,
        creditBalance: true,
        stripeCustomerId: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const access = await checkUserAccess(req.user.id);
    const now = new Date();

    // Calculate trial days remaining
    let trialDaysRemaining = null;
    if (user.trialStartDate && user.trialEndDate && now <= user.trialEndDate) {
      trialDaysRemaining = Math.ceil((user.trialEndDate - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
      trialDaysRemaining,
      accessStatus: user.accessStatus,
      hasAccess: access.hasAccess,
      currentPlanName: user.currentPlanName,
      planStartDate: user.planStartDate,
      planEndDate: user.planEndDate,
      creditBalance: parseFloat(user.creditBalance) || 0,
      stripeCustomerId: user.stripeCustomerId
    });
  } catch (error) {
    console.error('Get billing status error:', error);
    res.status(500).json({ error: 'Failed to get billing status' });
  }
});

// =============================================
// POST /api/billing/create-checkout
// Create Stripe checkout session for deposit
// =============================================
router.post('/billing/create-checkout', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create checkout session
    const session = await createCheckoutSession(user, amount);

    // Create pending transaction record
    await prisma.paymentTransaction.create({
      data: {
        userId: user.id,
        amount: amount,
        currency: 'usd',
        stripeCheckoutSessionId: session.id,
        status: 'PENDING',
        transactionType: 'DEPOSIT',
        description: `Account credit deposit of $${amount}`
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      publishableKey: STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

// =============================================
// POST /api/billing/activate-plan
// Activate a plan using credit balance
// =============================================
router.post('/billing/activate-plan', authenticate, async (req, res) => {
  try {
    const { planName, planPrice, planDurationDays } = req.body;

    if (!planName || !planPrice) {
      return res.status(400).json({ error: 'Plan name and price are required' });
    }

    // Get user with current credit balance
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const creditBalance = parseFloat(user.creditBalance) || 0;
    const planPriceNum = parseFloat(planPrice);

    // Check if user has sufficient credit
    if (creditBalance < planPriceNum) {
      return res.status(400).json({
        error: 'Insufficient credit',
        creditBalance,
        requiredAmount: planPriceNum,
        shortfall: planPriceNum - creditBalance
      });
    }

    // Calculate plan end date
    const planStartDate = new Date();
    const planEndDate = planDurationDays
      ? new Date(planStartDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000)
      : null; // If no duration, plan doesn't expire

    // Deduct credit and activate plan
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        creditBalance: creditBalance - planPriceNum,
        currentPlanName: planName,
        planStartDate: planStartDate,
        planEndDate: planEndDate,
        accessStatus: 'PAID_ACTIVE'
      }
    });

    // Create transaction record
    await prisma.paymentTransaction.create({
      data: {
        userId: user.id,
        amount: planPriceNum,
        currency: 'usd',
        status: 'SUCCEEDED',
        transactionType: 'PLAN_PURCHASE',
        description: `Activated plan: ${planName}`,
        metadata: {
          planName,
          planDurationDays: planDurationDays || null
        }
      }
    });

    res.json({
      success: true,
      message: `Plan "${planName}" activated successfully`,
      planName: updatedUser.currentPlanName,
      planStartDate: updatedUser.planStartDate,
      planEndDate: updatedUser.planEndDate,
      remainingCredit: parseFloat(updatedUser.creditBalance)
    });
  } catch (error) {
    console.error('Activate plan error:', error);
    res.status(500).json({ error: 'Failed to activate plan', details: error.message });
  }
});

// =============================================
// GET /api/billing/plans
// Get available plans
// =============================================
router.get('/billing/plans', authenticate, async (req, res) => {
  try {
    // Get plans from database
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: 'asc' }
    });

    res.json(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

// =============================================
// GET /api/billing/transactions
// Get user's payment transactions
// =============================================
router.get('/billing/transactions', authenticate, async (req, res) => {
  try {
    const transactions = await prisma.paymentTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// =============================================
// POST /api/billing/webhook
// Stripe webhook handler (must be public, signature verified)
// =============================================
router.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Find transaction by checkout session ID
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { stripeCheckoutSessionId: session.id }
      });

      if (transaction && transaction.status === 'PENDING') {
        const userId = parseInt(session.metadata?.userId || transaction.userId);
        const amount = parseFloat(session.amount_total) / 100; // Convert from cents

        // Update transaction status
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'SUCCEEDED',
            stripePaymentIntentId: session.payment_intent,
            metadata: {
              ...transaction.metadata,
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent
            }
          }
        });

        // Add credit to user account
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (user) {
          const currentCredit = parseFloat(user.creditBalance) || 0;
          await prisma.user.update({
            where: { id: userId },
            data: {
              creditBalance: currentCredit + amount,
              lastPaymentStatus: 'SUCCEEDED',
              lastPaymentDate: new Date()
            }
          });

          console.log(`✅ Added $${amount} credit to user ${userId}. New balance: $${currentCredit + amount}`);
        }
      }
    } else if (event.type === 'payment_intent.succeeded') {
      // Additional confirmation if needed
      console.log('Payment intent succeeded:', event.data.object.id);
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.log('Payment failed:', paymentIntent.id);

      // Update transaction status if found
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id }
      });

      if (transaction) {
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' }
        });
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
});

// =============================================
// Admin: Grant credit to user
// =============================================
router.post('/billing/admin/grant-credit', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid userId and amount are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentCredit = parseFloat(user.creditBalance) || 0;
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        creditBalance: currentCredit + parseFloat(amount)
      }
    });

    // Create transaction record
    await prisma.paymentTransaction.create({
      data: {
        userId: user.id,
        amount: parseFloat(amount),
        currency: 'usd',
        status: 'SUCCEEDED',
        transactionType: 'DEPOSIT',
        description: description || `Admin credit grant by ${req.user.email}`
      }
    });

    res.json({
      success: true,
      message: `Granted $${amount} credit to user`,
      newBalance: parseFloat(updatedUser.creditBalance)
    });
  } catch (error) {
    console.error('Grant credit error:', error);
    res.status(500).json({ error: 'Failed to grant credit' });
  }
});

module.exports = router;

