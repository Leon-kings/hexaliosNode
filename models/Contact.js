const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
  },
  subject: {
    type: String,
    required: [true, 'Please provide a subject'],
    trim: true,
    maxlength: [100, 'Subject cannot be more than 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Please provide a message'],
    trim: true,
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'responded', 'spam'],
    default: 'pending'
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: Date
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });

// Static method for getting contact statistics
contactSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalContacts: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        responded: { $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] } },
        spam: { $sum: { $cond: [{ $eq: ['$status', 'spam'] }, 1, 0] } },
        today: { 
          $sum: { 
            $cond: [{ $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] }, 1, 0] 
          } 
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalContacts: 1,
        pending: 1,
        responded: 1,
        spam: 1,
        today: 1
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : {
    totalContacts: 0,
    pending: 0,
    responded: 0,
    spam: 0,
    today: 0
  };
};

module.exports = mongoose.model('Contact', contactSchema);