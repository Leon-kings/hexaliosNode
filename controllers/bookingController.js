const Booking = require('../models/bookingModel');
const { sendBookingEmail } = require('../services/emailService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Helper: Check booking exists
const checkBooking = async (id) => {
  const booking = await Booking.findById(id);
  if (!booking) throw new AppError('Booking not found', 404);
  return booking;
};

// Create booking
exports.createBooking = catchAsync(async (req, res) => {
  const booking = await Booking.create(req.body);
  await sendBookingEmail(booking, 'created');
  res.status(201).json({ status: 'success', data: { booking } });
});

// Update booking
exports.updateBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  await checkBooking(req.params.id);
  await sendBookingEmail(booking, 'updated');
  res.status(200).json({ status: 'success', data: { booking } });
});

// Cancel booking
exports.cancelBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { 'bookingDetails.status': 'cancelled' },
    { new: true }
  );
  await checkBooking(req.params.id);
  await sendBookingEmail(booking, 'cancelled');
  res.status(200).json({ status: 'success', data: { booking } });
});

// Get single booking
exports.getBooking = catchAsync(async (req, res) => {
  const booking = await checkBooking(req.params.id);
  res.status(200).json({ status: 'success', data: { booking } });
});

// Get all bookings
exports.getAllBookings = catchAsync(async (req, res) => {
  const bookings = await Booking.find();
  res.status(200).json({ status: 'success', data: { bookings } });
});