const config = require('../config');
const stripe = require('stripe');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Process payment
exports.processPayment = catchAsync(async (req, res) => {
  const { amount, paymentMethod, customerEmail } = req.body;

  // For demo purposes, we're only implementing Stripe
  // In a real app, you would have different processors for different methods
  if (paymentMethod !== 'credit-card') {
    throw new AppError('Payment method not supported', 400);
  }

  // Create a payment intent with Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // convert to cents
    currency: 'usd',
    receipt_email: customerEmail,
    description: 'E-commerce purchase',
    metadata: { integration_check: 'accept_a_payment' }
  });

  res.status(200).json({
    status: 'success',
    data: {
      paymentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    }
  });
});