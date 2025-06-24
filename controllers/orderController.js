const Order = require('../models/Order');
const { sendOrderConfirmation, sendAdminNotificationEmail } = require('../services/emailService');

exports.createOrder = async (req, res) => {
  try {
    const { customer, products, payment, shipping } = req.body;

    let totalPrice = 0;
    const productDetails = products.map(item => {
      totalPrice += item.price * item.quantity;
      return {
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      };
    });

    if (payment.amount !== totalPrice) {
      return res.status(400).json({ error: 'Payment amount does not match order total' });
    }

    const order = new Order({
      customer,
      products: productDetails,
      payment,
      shipping,
      totalPrice
    });

    await order.save();
    await sendOrderConfirmation(order);
    if (order.payment.status === 'paid') {
      await sendAdminNotificationEmail(order);
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('products.productId');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const updates = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (updates.payment?.status === 'paid' && order.payment.status === 'paid') {
      await sendAdminNotificationEmail(order);
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPaymentStats = async (req, res) => {
  try {
    const stats = await Order.getPaymentStatistics();
    res.json(stats[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDailyRevenue = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const revenue = await Order.getDailyRevenue(days);
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};