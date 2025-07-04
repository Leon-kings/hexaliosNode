const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true }
  },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true }
  }],
  payment: {
    paymentId: { type: String },
    method: { type: String, enum: ['card'], default: 'card' },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    currency: { type: String, default: 'usd' },
    cardDetails: {
      number: { 
        type: String, 
        required: function() { return this.payment.method === 'card'; },
        validate: {
          validator: function(v) {
            return /^[0-9]{13,19}$/.test(v);
          },
          message: props => `${props.value} is not a valid credit card number!`
        }
      },
      nameOnCard: { 
        type: String, 
        required: function() { return this.payment.method === 'card'; },
        trim: true
      },
      expiryDate: {
        type: String,
        required: function() { return this.payment.method === 'card'; },
        validate: {
          validator: function(v) {
            return /^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(v);
          },
          message: props => `${props.value} is not a valid expiry date (MM/YY format)!`
        }
      },
      cvv: {
        type: String,
        required: function() { return this.payment.method === 'card'; },
        validate: {
          validator: function(v) {
            return /^[0-9]{3,4}$/.test(v);
          },
          message: props => `${props.value} is not a valid CVV!`
        }
      }
    }
  },
  shipping: {
    status: { type: String, enum: ['processing', 'shipped', 'delivered'], default: 'processing' },
    estimatedDelivery: Date
  },
  totalPrice: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Payment statistics method
orderSchema.statics.getPaymentStatistics = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$payment.status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$payment.amount' }
      }
    },
    {
      $group: {
        _id: null,
        stats: {
          $push: {
            status: '$_id',
            count: '$count',
            totalAmount: '$totalAmount'
          }
        },
        totalOrders: { $sum: '$count' },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    {
      $addFields: {
        paidStats: {
          $filter: {
            input: '$stats',
            as: 'stat',
            cond: { $eq: ['$$stat.status', 'paid'] }
          }
        },
        failedStats: {
          $filter: {
            input: '$stats',
            as: 'stat',
            cond: { $eq: ['$$stat.status', 'failed'] }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        stats: 1,
        totalOrders: 1,
        totalRevenue: 1,
        paidCount: { $arrayElemAt: ['$paidStats.count', 0] },
        paidAmount: { $arrayElemAt: ['$paidStats.totalAmount', 0] },
        failedCount: { $arrayElemAt: ['$failedStats.count', 0] },
        failedAmount: { $arrayElemAt: ['$failedStats.totalAmount', 0] }
      }
    }
  ]);
};

// Daily revenue method
orderSchema.statics.getDailyRevenue = async function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        'payment.status': 'paid',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        date: { $first: '$createdAt' },
        totalAmount: { $sum: '$payment.amount' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = mongoose.model('Order', orderSchema);