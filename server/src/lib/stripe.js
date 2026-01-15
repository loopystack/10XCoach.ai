/**
 * Stripe Integration
 * Handles Stripe API interactions
 */

const Stripe = require('stripe');

// Get Stripe keys from environment variables (must be set in .env file)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('⚠️  WARNING: STRIPE_SECRET_KEY is not set in environment variables');
  console.error('   Please add STRIPE_SECRET_KEY to your .env file');
}

if (!STRIPE_PUBLISHABLE_KEY) {
  console.error('⚠️  WARNING: STRIPE_PUBLISHABLE_KEY is not set in environment variables');
  console.error('   Please add STRIPE_PUBLISHABLE_KEY to your .env file');
}

// Initialize Stripe only if secret key is provided
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
} else {
  console.error('❌ Cannot initialize Stripe: STRIPE_SECRET_KEY is missing');
}

/**
 * Create or retrieve Stripe customer for user
 */
const getOrCreateCustomer = async (user) => {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Please set STRIPE_SECRET_KEY in .env file');
  }
  
  try {
    // If user already has Stripe customer ID, retrieve it
    if (user.stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);
        console.log(`✅ Retrieved existing Stripe customer: ${customer.id}`);
        return customer;
      } catch (retrieveError) {
        // If customer doesn't exist in Stripe, create a new one
        console.warn(`⚠️ Customer ${user.stripeCustomerId} not found in Stripe, creating new customer`);
        // Continue to create new customer below
      }
    }

    // Create new Stripe customer
    console.log(`📝 Creating new Stripe customer for user ${user.id} (${user.email})`);
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || user.email,
      metadata: {
        userId: user.id.toString(),
        userEmail: user.email
      }
    });
    console.log(`✅ Created Stripe customer: ${customer.id}`);

    // Update user with Stripe customer ID
    try {
      const prisma = require('./prisma');
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id }
      });
      console.log(`✅ Updated user ${user.id} with Stripe customer ID: ${customer.id}`);
    } catch (updateError) {
      console.error('⚠️ Failed to update user with Stripe customer ID:', updateError);
      // Don't throw - customer was created successfully, just couldn't save the ID
      // This is not critical for the checkout to work
    }

    return customer;
  } catch (error) {
    console.error('❌ Error creating/retrieving Stripe customer:', error);
    console.error('   Error type:', error.type);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    throw error;
  }
};

/**
 * Create checkout session for deposit/payment
 */
const createCheckoutSession = async (user, amount, currency = 'usd', metadata = {}) => {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Please set STRIPE_SECRET_KEY in .env file');
  }
  
  if (!STRIPE_PUBLISHABLE_KEY) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is not set in .env file');
  }
  
  try {
    console.log(`🔧 Creating checkout session for user ${user.id}, amount: $${amount}`);
    const customer = await getOrCreateCustomer(user);

    const frontendUrl = process.env.FRONTEND_URL || 'https://10xcoach.ai';
    console.log(`🔗 Using frontend URL: ${frontendUrl}`);

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
      success_url: `${frontendUrl}/plans?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/plans?payment=cancelled`,
      metadata: {
        userId: user.id.toString(),
        userEmail: user.email,
        type: 'deposit',
        amount: amount.toString(),
        ...metadata
      }
    });

    console.log(`✅ Checkout session created successfully: ${session.id}`);
    return session;
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    console.error('   Error type:', error.type);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    throw error;
  }
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Please set STRIPE_SECRET_KEY in .env file');
  }
  
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

