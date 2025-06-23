const Order = require('../models/Order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendOrderConfirmation, sendAdminNotification } = require('../services/emailService');

// Create order with Stripe payment
exports.createOrder = async (req, res) => {
  try {
    const { customer, products, paymentMethodId } = req.body;
    const totalPrice = products.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create Stripe payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100),
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      metadata: { integration_check: 'accept_a_payment' }
    });

    // Create order
    const order = new Order({
      customer,
      products,
      payment: {
        paymentId: paymentIntent.id,
        method: 'card',
        amount: totalPrice,
        status: paymentIntent.status === 'succeeded' ? 'paid' : 'failed'
      },
      totalPrice
    });

    await order.save();

    // Send emails if payment succeeded
    if (paymentIntent.status === 'succeeded') {
      await sendOrderConfirmation(order);
      await sendAdminNotification(order);
    }

    res.status(201).json({
      success: paymentIntent.status === 'succeeded',
      data: order,
      message: paymentIntent.status === 'succeeded' ? 
        'Order created successfully' : 'Payment failed'
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get all orders
exports.getOrders = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const filter = {};
    
    if (status) filter['payment.status'] = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get order statistics
exports.getOrderStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$payment.amount' },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0] }
          },
          failedOrders: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'failed'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: 1,
          paidOrders: 1,
          failedOrders: 1,
          successRate: {
            $cond: [
              { $eq: ['$totalOrders', 0] },
              0,
              { $divide: ['$paidOrders', '$totalOrders'] }
            ]
          }
        }
      }
    ]);

    const dailyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          'payment.status': 'paid'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          date: { $first: '$createdAt' },
          dailyRevenue: { $sum: '$payment.amount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          paidOrders: 0,
          failedOrders: 0,
          successRate: 0
        },
        dailyStats
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Other CRUD operations (getOrder, updateOrder, deleteOrder) would be here...