// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const config = require('./config');

// // Import routes
// const orderRoutes = require('./routes/orderRoutes');
// // const productRoutes = require('./routes/productRoutes');
// const authRoutes = require('./routes/authRoutes');
// const statsRoutes = require('./routes/statsRoutes');
// const subscriptionRouter = require('./routes/subscriptionRoutes');
// const bookingRouter = require('./routes/bookingRoutes');



// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Database connection
// mongoose.connect(config.mongoURI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
// .then(() => console.log('MongoDB connected successfully'))
// .catch(err => {
//   console.error('MongoDB connection error:', err);
//   process.exit(1);
// });

// // Routes
// app.use('/orders', orderRoutes);
// // app.use('/api/products', productRoutes);
// app.use('/auth', authRoutes);
// app.use('/v1/stats', statsRoutes);
// app.use('/subscriptions', subscriptionRouter);
// app.use('/bookings', bookingRouter);


// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ success: false, message: 'Internal server error' });
// });

// // Start server
// app.listen(config.port, () => {
//   console.log(`Server running on port ${config.port}`);
// });











require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config/config');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Import routes
const authRoutes = require('./routes/authRoutes');
const statsRoutes = require('./routes/statsRoutes');
const orderRoutes = require('./routes/orderRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const contactRoutes = require('./routes/contactRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection (exactly as you had it)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes (maintained exactly as you specified)
app.use('/auth', authRoutes);
app.use('/stats', statsRoutes);
app.use('/orders', orderRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/bookings', bookingRoutes);
app.use('/contacts', contactRoutes);

// Stripe webhook endpoint (unchanged from your version)
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle payment events exactly as you had
  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('Payment succeeded:', event.data.object.id);
      break;
      
    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object.id);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Error handling (kept identical to your version)
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);
  
  const response = {
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
  
  res.status(err.status || 500).json(response);
});

// Server startup (unchanged)
const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

// Process handlers (exactly as you had)
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});