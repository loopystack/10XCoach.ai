/**
 * Stripe Integration
 * Handles Stripe API interactions
 */

const Stripe = require('stripe');

// Use test keys for now (as requested)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_51Sn3qCBctBVL2BKmpz9R5zFmYzye03zoX0MLub0frolWSyDvTMbg2ZPsu4yS3zTIsnBJX7SglzrYccf4nktegpEH007WVZG1KE';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_live_51Sn3qCBctBVL2BKmne3WdoRI1S7nBt9Wcs6K5ocoXuAGHTAYyUFylY9AodI8eeWi0i0x5Amud0EWhfLT2J558q6v00JgVLwpzU';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Create or retrieve Stripe customer for user
 */
const getOrCreateCustomer = async (user) => {
  try {
    // If user already has Stripe customer ID, retrieve it
    if (user.stripeCustomerId) {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      return customer;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id.toString(),
        userEmail: user.email
      }
    });

    // Update user with Stripe customer ID
    const prisma = require('./prisma');
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id }
    });

    return customer;
  } catch (error) {
    console.error('Error creating/retrieving Stripe customer:', error);
    throw error;
  }
};

/**
 * Create checkout session for deposit/payment
 */
const createCheckoutSession = async (user, amount, currency = 'usd', metadata = {}) => {
  try {
    const customer = await getOrCreateCustomer(user);

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Account Credit Deposit',
              description: `Add $${amount} to your account credit balance`
            },
            unit_amount: Math.round(amount * 100) // Convert to cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'https://10xcoach.ai'}/plans?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://10xcoach.ai'}/plans?payment=cancelled`,
      metadata: {
        userId: user.id.toString(),
        userEmail: user.email,
        type: 'deposit',
        amount: amount.toString(),
        ...metadata
      }
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
};

module.exports = {
  stripe,
  getOrCreateCustomer,
  createCheckoutSession,
  verifyWebhookSignature,
  STRIPE_PUBLISHABLE_KEY
};

