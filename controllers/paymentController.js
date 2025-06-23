const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/bookingModel');
const { sendPaymentEmail } = require('../services/emailService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Helper: Check payment exists (via booking)
const checkPayment = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking || !booking.payment) {
    throw new AppError('Payment not found', 404);
  }
  return booking;
};

// Process payment for a booking
exports.processPayment = catchAsync(async (req, res) => {
  const { amount, paymentMethod, customerEmail } = req.body;
  const { bookingId } = req.params;

  // Verify booking exists
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  if (paymentMethod !== 'credit-card') {
    throw new AppError('Payment method not supported', 400);
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    receipt_email: customerEmail,
    description: `Booking #${bookingId}`,
    metadata: { bookingId }
  });

  // Update booking with payment info
  const updatedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    {
      payment: {
        amount,
        paymentMethod,
        paymentIntentId: paymentIntent.id,
        status: 'pending',
        processedAt: new Date()
      }
    },
    { new: true, runValidators: true }
  );

  await sendPaymentEmail(updatedBooking, 'created');
  
  res.status(201).json({
    status: 'success',
    data: {
      booking: updatedBooking,
      clientSecret: paymentIntent.client_secret
    }
  });
});

// Get payment by booking ID
exports.getPayment = catchAsync(async (req, res) => {
  const booking = await checkPayment(req.params.bookingId);
  res.status(200).json({
    status: 'success',
    data: {
      payment: booking.payment
    }
  });
});

// Update payment status
exports.updatePaymentStatus = catchAsync(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.bookingId,
    { 'payment.status': req.body.status },
    { new: true, runValidators: true }
  );
  
  await checkPayment(req.params.bookingId);
  await sendPaymentEmail(booking, 'updated');
  
  res.status(200).json({
    status: 'success',
    data: {
      payment: booking.payment
    }
  });
});

// Refund payment
exports.refundPayment = catchAsync(async (req, res) => {
  const booking = await checkPayment(req.params.bookingId);
  
  // Process refund with Stripe
  await stripe.refunds.create({
    payment_intent: booking.payment.paymentIntentId,
  });

  const updatedBooking = await Booking.findByIdAndUpdate(
    req.params.bookingId,
    { 'payment.status': 'refunded' },
    { new: true }
  );

  await sendPaymentEmail(updatedBooking, 'refunded');
  
  res.status(200).json({
    status: 'success',
    data: {
      payment: updatedBooking.payment
    }
  });
});