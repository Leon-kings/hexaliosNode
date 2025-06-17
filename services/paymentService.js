const config = require('../config');
const stripe = require('stripe')(config.stripe.secretKey);

exports.processPayment = async ({ amount, paymentMethod, customerEmail }) => {
  try {
    // For demo purposes, we're only implementing Stripe
    // In a real app, you would have different processors for different methods
    if (paymentMethod !== 'credit-card') {
      return { success: false, message: 'Payment method not supported' };
    }

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: 'usd',
      receipt_email: customerEmail,
      description: 'E-commerce purchase',
      metadata: { integration_check: 'accept_a_payment' }
    });

    return { 
      success: true, 
      paymentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return { 
      success: false, 
      message: error.message || 'Payment processing failed' 
    };
  }
};