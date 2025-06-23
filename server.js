require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');

// Import routes
const orderRoutes = require('./routes/orderRoutes');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const statsRoutes = require('./routes/statsRoutes');
const subscriptionRouter = require('./routes/subscriptionRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const contactRutes = require('./routes/contactRoutes')

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(config.mongoURI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes


app.use('/auth', authRoutes);
app.use('/v1/stats', statsRoutes);
app.use('/subscriptions', subscriptionRouter);
app.use('/bookings', bookingRouter);

app.use('/contacts', contactRutes);

// Stripe webhook endpoint
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle payment events
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Update order status in database
      break;
    case 'payment_intent.payment_failed':
      // Update order status in database
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Routes
app.use('/orders', orderRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Server error' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});