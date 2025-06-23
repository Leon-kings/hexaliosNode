const mongoose = require('mongoose');
const validator = require('validator');

const bookingSchema = new mongoose.Schema({
  service: {
    id: { type: String, required: true },
    title: { type: String, required: true },
    duration: { type: Number, min: 5 },
    price: { type: Number, min: 0 }
  },
  customer: {
    name: { type: String, required: true },
    email: { 
      type: String, 
      required: true,
      validate: [validator.isEmail, 'Invalid email']
    },
    phone: { type: String, required: true }
  },
  bookingDetails: {
    preferredDate: { 
      type: Date, 
      required: true,
      validate: {
        validator: v => v > Date.now(),
        message: 'Date must be in future'
      }
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);