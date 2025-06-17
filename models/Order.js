const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true }
  },
  paymentMethod: { type: String, required: true, enum: ['credit-card', 'paypal', 'bank-transfer'] },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    size: { type: String },
    quantity: { type: Number, required: true }
  }],
  totalPrice: { type: Number, required: true },
  commodityPrice: { type: Number, required: true },
  paymentStatus: { type: String, default: 'pending', enum: ['pending', 'completed', 'failed'] },
  orderStatus: { type: String, default: 'processing', enum: ['processing', 'shipped', 'delivered', 'cancelled'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method for order statistics
orderSchema.statics.getStatistics = async function() {
  const totalOrders = await this.countDocuments();
  const totalRevenue = await this.aggregate([
    { $match: { paymentStatus: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ]);
  
  return {
    totalOrders,
    totalRevenue: totalRevenue.length ? totalRevenue[0].total : 0,
    avgOrderValue: totalOrders ? (totalRevenue.length ? totalRevenue[0].total / totalOrders : 0) : 0
  };
};

module.exports = mongoose.model('Order', orderSchema);