const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendOrderConfirmationEmail, sendAdminNotificationEmail } = require('../services/emailService');
const { processPayment } = require('../services/paymentService');

exports.createOrder = async (req, res) => {
  try {
    const { customer, paymentMethod, products, totalPrice, commodityPrice } = req.body;

    // Validate required fields
    if (!customer || !customer.name || !customer.email || !customer.address || 
        !paymentMethod || !products || !products.length || !totalPrice || !commodityPrice) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify product availability and quantities
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product ${item.name} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${item.name}. Available: ${product.stock}`
        });
      }
    }

    // Process payment
    const paymentResult = await processPayment({
      amount: totalPrice,
      paymentMethod,
      customerEmail: customer.email
    });

    if (!paymentResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: paymentResult.message || 'Payment processing failed'
      });
    }

    // Create the order
    const order = new Order({
      customer,
      paymentMethod,
      products,
      totalPrice,
      commodityPrice,
      paymentStatus: 'completed'
    });

    await order.save();

    // Update product stocks
    for (const item of products) {
      await Product.findByIdAndUpdate(item.productId, { 
        $inc: { stock: -item.quantity },
        $inc: { salesCount: item.quantity }
      });
    }

    // Send emails
    await sendOrderConfirmationEmail(order);
    await sendAdminNotificationEmail(order);

    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully', 
      order 
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

exports.getOrderStatistics = async (req, res) => {
  try {
    const statistics = await Order.getStatistics();
    res.json({ success: true, statistics });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get statistics', 
      error: error.message 
    });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get orders', 
      error: error.message 
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get order', 
      error: error.message 
    });
  }
};