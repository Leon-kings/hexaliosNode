const Booking = require('../models/bookingModel');
const AppError = require('../utils/AppError');
const { Email } = require('../services/emailService');

// Helper function to check time conflicts
const hasTimeConflict = async (email, date, excludeId = null) => {
  const timeWindow = 60 * 60 * 1000; // 1 hour in milliseconds
  const bookingDate = new Date(date);

  const query = {
    email,
    status: { $ne: 'cancelled' },
    date: {
      $gte: new Date(bookingDate.getTime() - timeWindow),
      $lte: new Date(bookingDate.getTime() + timeWindow)
    }
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return await Booking.findOne(query);
};

// Helper functions for date calculations
const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(d.setDate(diff));
};

const getStartOfMonth = (date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getStartOfYear = (date = new Date()) => {
  return new Date(date.getFullYear(), 0, 1);
};

// CREATE BOOKING
exports.createBooking = async (req, res, next) => {
  try {
    const { name, email, phone, date, notes } = req.body;

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return next(new AppError('Invalid date format', 400));
    }

    const conflict = await hasTimeConflict(email, date);
    if (conflict) {
      const existingTime = new Date(conflict.date).toLocaleTimeString();
      return next(new AppError(
        `You already have a booking within 1 hour of this time (${existingTime})`,
        400
      ));
    }

    const newBooking = await Booking.create({
      name,
      email,
      phone,
      date: bookingDate,
      notes,
      status: 'confirmed'
    });

    try {
      const emailService = new Email({ email, name }, `${process.env.FRONTEND_URL}/bookings`);
      await emailService.sendBookingConfirmation();
      await Email.sendAdminBookingNotification(newBooking);
    } catch (emailError) {
      console.error('Failed to send booking email:', emailError);
    }

    res.status(201).json({
      status: 'success',
      data: {
        booking: newBooking
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('Email already has a booking', 400));
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(el => el.message);
      return next(new AppError(messages.join(', '), 400));
    }
    next(err);
  }
};

// GET ALL BOOKINGS
exports.getAllBookings = async (req, res, next) => {
  try {
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    let query = Booking.find(JSON.parse(queryStr));

    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }

    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numBookings = await Booking.countDocuments();
      if (skip >= numBookings) throw new Error('This page does not exist');
    }

    const bookings = await query;

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: {
        bookings
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET SINGLE BOOKING
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return next(new AppError('No booking found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE BOOKING
exports.updateBooking = async (req, res, next) => {
  try {
    const { date, status } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return next(new AppError('No booking found with that ID', 404));
    }

    if (date) {
      const newDate = new Date(date);
      if (isNaN(newDate.getTime())) {
        return next(new AppError('Invalid date format', 400));
      }

      const conflict = await hasTimeConflict(booking.email, date, req.params.id);
      if (conflict) {
        const existingTime = new Date(conflict.date).toLocaleTimeString();
        return next(new AppError(
          `You already have a booking within 1 hour of this time (${existingTime})`,
          400
        ));
      }
    }

    if (status && booking.status === 'cancelled' && status !== 'cancelled') {
      return next(new AppError('Cannot reactivate a cancelled booking', 400));
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (status && status !== booking.status) {
      try {
        const emailService = new Email(
          { email: booking.email, name: booking.name },
          `${process.env.FRONTEND_URL}/bookings`
        );
        
        if (status === 'cancelled') {
          await emailService.send(
            'Booking Cancelled',
            `Your booking for ${new Date(updatedBooking.date).toLocaleString()} has been cancelled.`,
            { type: 'error' }
          );
        } else {
          await emailService.send(
            'Booking Updated',
            `Your booking has been updated to status: ${status}`,
            { type: 'info' }
          );
        }
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        booking: updatedBooking
      }
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(el => el.message);
      return next(new AppError(messages.join(', '), 400));
    }
    next(err);
  }
};

// DELETE BOOKING
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return next(new AppError('No booking found with that ID', 404));
    }

    try {
      const emailService = new Email(
        { email: booking.email, name: booking.name },
        `${process.env.FRONTEND_URL}/bookings`
      );
      await emailService.send(
        'Booking Cancelled',
        `Your booking for ${new Date(booking.date).toLocaleString()} has been cancelled.`,
        { type: 'error' }
      );
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};

// GET USER BOOKINGS
exports.getUserBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ email: req.params.email })
      .sort('date')
      .select('-__v');

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: {
        bookings
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET UPCOMING BOOKINGS
exports.getUpcomingBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      date: { $gte: new Date() },
      status: { $ne: 'cancelled' }
    })
    .sort('date')
    .limit(10);

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: {
        bookings
      }
    });
  } catch (err) {
    next(err);
  }
};

// BOOKING STATISTICS
exports.getBookingStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    const startOfWeek = getStartOfWeek();
    const startOfMonth = getStartOfMonth();
    const startOfYear = getStartOfYear();

    const stats = await Booking.aggregate([
      {
        $facet: {
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          todayBookings: [
            { 
              $match: { 
                date: { $gte: startOfToday, $lte: endOfToday },
                status: { $ne: 'cancelled' }
              }
            },
            { $count: 'count' }
          ],
          weeklyStats: [
            {
              $match: {
                date: { $gte: startOfWeek },
                status: { $ne: 'cancelled' }
              }
            },
            { $group: { _id: { $dayOfWeek: '$date' }, count: { $sum: 1 } } },
            { $sort: { '_id': 1 } }
          ],
          monthlyStats: [
            {
              $match: {
                date: { $gte: startOfMonth },
                status: { $ne: 'cancelled' }
              }
            },
            { $group: { _id: { $week: '$date' }, count: { $sum: 1 } } },
            { $sort: { '_id': 1 } }
          ],
          yearlyTrends: [
            {
              $match: {
                date: { $gte: startOfYear },
                status: { $ne: 'cancelled' }
              }
            },
            { $group: { _id: { $month: '$date' }, count: { $sum: 1 } } },
            { $sort: { '_id': 1 } }
          ],
          peakHours: [
            { $group: { _id: { $hour: '$date' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]
        }
      },
      {
        $project: {
          statusCounts: 1,
          todayCount: { $arrayElemAt: ['$todayBookings.count', 0] },
          weeklyStats: 1,
          monthlyStats: 1,
          yearlyTrends: 1,
          peakHours: 1,
          totalBookings: { $sum: '$statusCounts.count' },
          upcomingBookings: {
            $reduce: {
              input: '$statusCounts',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this._id', 'confirmed'] },
                  { $add: ['$$value', '$$this.count'] },
                  '$$value'
                ]
              }
            }
          }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: stats[0]
      }
    });
  } catch (err) {
    next(err);
  }
};

// BOOKING TRENDS
exports.getBookingTrends = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    let groupBy, dateRange;
    switch (period) {
      case 'day':
        groupBy = { $hour: '$date' };
        dateRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        groupBy = { $dayOfWeek: '$date' };
        dateRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        groupBy = { $month: '$date' };
        dateRange = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
        break;
      default: // month
        groupBy = { $week: '$date' };
        dateRange = new Date(new Date().setMonth(new Date().getMonth() - 1));
    }

    const trends = await Booking.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          date: { $gte: dateRange }
        }
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        period,
        trends
      }
    });
  } catch (err) {
    next(err);
  }
};

// USER BOOKING STATS
exports.getUserBookingStats = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const stats = await Booking.aggregate([
      { $match: { user: userId } },
      {
        $facet: {
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          monthlyActivity: [
            {
              $group: {
                _id: {
                  year: { $year: '$date' },
                  month: { $month: '$date' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 6 }
          ],
          favoriteTimes: [
            { $group: { _id: { $hour: '$date' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 3 }
          ]
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: stats[0]
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = exports;