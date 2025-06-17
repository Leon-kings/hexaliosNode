require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');

// Import routes
const orderRoutes = require('./routes/orderRoutes');
// const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const statsRoutes = require('./routes/statsRoutes');
const subscriptionRouter = require('./routes/subscriptionRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
app.use('/orders', orderRoutes);
// app.use('/api/products', productRoutes);
app.use('/auth', authRoutes);
app.use('/v1/stats', statsRoutes);
app.use('/subscriptions', subscriptionRouter);
app.use('/bookings', bookingRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});