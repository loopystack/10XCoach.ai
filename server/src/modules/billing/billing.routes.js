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
    // Try to get user with billing fields, but handle case where fields don't exist yet
    let user;
    try {
      user = await prisma.user.findUnique({
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
    } catch (dbError) {
      // If database fields don't exist, get basic user and initialize defaults
      console.warn('Billing fields may not exist in database yet:', dbError.message);
      user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true }
      });
      
      if (user) {
        // Initialize default values for users without billing fields
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + 14);
        
        return res.json({
          trialStartDate: now.toISOString(),
          trialEndDate: trialEnd.toISOString(),
          trialDaysRemaining: 14,
          accessStatus: 'TRIAL_ACTIVE',
          hasAccess: true,
          currentPlanName: null,
          planStartDate: null,
          planEndDate: null,
          creditBalance: 0,
          stripeCustomerId: null,
          _migrationNeeded: true
        });
      }
    }

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
      accessStatus: user.accessStatus || 'TRIAL_ACTIVE',
      hasAccess: access.hasAccess,
      currentPlanName: user.currentPlanName,
      planStartDate: user.planStartDate,
      planEndDate: user.planEndDate,
      creditBalance: parseFloat(user.creditBalance) || 0,
      stripeCustomerId: user.stripeCustomerId
    });
  } catch (error) {
    console.error('Get billing status error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get billing status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

    // Check if Stripe is initialized
    if (!stripe) {
      console.error('❌ Stripe is not initialized. Check STRIPE_SECRET_KEY in .env');
      return res.status(500).json({ 
        error: 'Payment system is not configured. Please contact support.',
        details: 'Stripe is not initialized'
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`💳 Creating checkout session for user ${user.id}, amount: $${amount}`);

    // Create checkout session
    let session;
    try {
      session = await createCheckoutSession(user, amount);
      console.log(`✅ Checkout session created: ${session.id}`);
    } catch (stripeError) {
      console.error('❌ Stripe checkout session creation failed:', stripeError);
      console.error('   Error type:', stripeError.type);
      console.error('   Error code:', stripeError.code);
      console.error('   Error message:', stripeError.message);
      return res.status(500).json({ 
        error: 'Failed to create checkout session',
        details: stripeError.message || 'Stripe API error'
      });
    }

    // Create pending transaction record
    try {
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
      console.log(`✅ Payment transaction record created for session ${session.id}`);
    } catch (dbError) {
      console.error('❌ Failed to create payment transaction record:', dbError);
      console.error('   Error code:', dbError.code);
      console.error('   Error message:', dbError.message);
      // Don't fail the request if transaction record creation fails
      // The webhook will handle it
    }

    res.json({
      sessionId: session.id,
      url: session.url,
      publishableKey: STRIPE_PUBLISHABLE_KEY
    });
  } catch (error) {
    console.error('❌ Create checkout error:', error);
    console.error('   Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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

// Helper function to process successful payment
const processPaymentSuccess = async (sessionId) => {
  try {
    console.log(`🔄 Processing payment for session: ${sessionId}`);
    
    // Find transaction by checkout session ID
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { stripeCheckoutSessionId: sessionId }
    });

    if (!transaction) {
      console.log(`⚠️ No transaction found for session: ${sessionId}`);
      return { success: false, message: 'Transaction not found' };
    }

    if (transaction.status !== 'PENDING') {
      console.log(`ℹ️ Transaction ${transaction.id} already processed with status: ${transaction.status}`);
      return { success: true, message: 'Already processed', alreadyProcessed: true };
    }

    // Retrieve session from Stripe to get payment details
    if (!stripe) {
      throw new Error('Stripe is not initialized');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      console.log(`⚠️ Session ${sessionId} payment status is: ${session.payment_status}`);
      return { success: false, message: `Payment status is ${session.payment_status}` };
    }

    const userId = parseInt(session.metadata?.userId || transaction.userId);
    const amount = parseFloat(session.amount_total) / 100; // Convert from cents

    console.log(`💳 Processing payment: User ${userId}, Amount $${amount}, Session ${sessionId}`);

    // Update transaction status
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCEEDED',
        stripePaymentIntentId: session.payment_intent,
        metadata: {
          ...(transaction.metadata || {}),
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
          processedAt: new Date().toISOString()
        }
      }
    });

    // Add credit to user account
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.error(`❌ User ${userId} not found`);
      return { success: false, message: 'User not found' };
    }

    const currentCredit = parseFloat(user.creditBalance) || 0;
    const newCredit = currentCredit + amount;

    await prisma.user.update({
      where: { id: userId },
      data: {
        creditBalance: newCredit,
        lastPaymentStatus: 'SUCCEEDED',
        lastPaymentDate: new Date()
      }
    });

    console.log(`✅ Added $${amount} credit to user ${userId}. New balance: $${newCredit}`);
    return { success: true, amount, newCredit, userId };
  } catch (error) {
    console.error('❌ Error processing payment:', error);
    console.error('   Error stack:', error.stack);
    return { success: false, message: error.message };
  }
};

// =============================================
// GET /api/billing/verify-payment
// Verify payment status and process if needed (fallback for webhook)
// =============================================
router.get('/billing/verify-payment', authenticate, async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const result = await processPaymentSuccess(session_id);

    if (result.success) {
      res.json({
        success: true,
        message: result.alreadyProcessed ? 'Payment already processed' : 'Payment verified and credit added',
        amount: result.amount,
        newCredit: result.newCredit
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message || 'Failed to verify payment'
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment', details: error.message });
  }
});

// =============================================
// POST /api/billing/webhook
// Stripe webhook handler (must be public, signature verified)
// =============================================
router.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('📥 Webhook received');

  // If webhook secret is not set, log warning but still try to process
  if (!webhookSecret) {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification will fail.');
    console.warn('   For production, set STRIPE_WEBHOOK_SECRET in .env file');
  }

  let event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // In development/test mode, parse the event without verification
      console.warn('⚠️ Skipping webhook signature verification (STRIPE_WEBHOOK_SECRET not set)');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    console.error('   This might be okay in development, but should be fixed in production');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📨 Webhook event type: ${event.type}`);

  // Handle the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log(`✅ Checkout session completed: ${session.id}`);

      const result = await processPaymentSuccess(session.id);
      if (result.success && !result.alreadyProcessed) {
        console.log(`✅ Webhook processed payment successfully for session ${session.id}`);
      } else if (result.alreadyProcessed) {
        console.log(`ℹ️ Payment was already processed for session ${session.id}`);
      } else {
        console.error(`❌ Failed to process payment for session ${session.id}: ${result.message}`);
      }
    } else if (event.type === 'payment_intent.succeeded') {
      // Additional confirmation if needed
      console.log('💳 Payment intent succeeded:', event.data.object.id);
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      console.log('❌ Payment failed:', paymentIntent.id);

      // Update transaction status if found
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id }
      });

      if (transaction) {
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' }
        });
        console.log(`✅ Updated transaction ${transaction.id} status to FAILED`);
      }
    } else {
      console.log(`ℹ️ Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    console.error('   Error stack:', error.stack);
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message });
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

