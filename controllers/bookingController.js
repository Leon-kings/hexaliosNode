const Booking = require("../models/bookingModel");
const {
  sendBookingConfirmation,
  sendAdminBookingNotification,
} = require("../services/emailService");
const validator = require("validator");
const { email } = require("../utils/Email");

// Helper function to format date
const formatBookingDate = (date) => {
  return new Date(date).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const booking = await Booking.create(req.body);

    if (process.env.NODE_ENV === "production") {
      await email.sendBookingConfirmation(booking);
      await email.sendAdminBookingNotification(booking);
    }

    res.status(201).json({ status: "success", data: { booking } });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: "success",
      results: bookings.length,
      data: {
        bookings,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Get a single booking
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        status: "fail",
        message: "Booking not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: {
        booking,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Update a booking
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!booking) {
      return res.status(404).json({
        status: "fail",
        message: "Booking not found",
      });
    }

    // Send update email if email or status changed
    if (req.body.customer?.email || req.body.bookingDetails?.status) {
      const email = new Email(
        {
          name: booking.customer.name,
          email: booking.customer.email,
        },
        `${process.env.FRONTEND_URL}/bookings/${booking._id}`
      );

      const message =
        req.body.bookingDetails?.notes ||
        "Your booking details have been updated.";

      await email.sendBookingUpdate(booking, message);
    }

    res.status(200).json({
      status: "success",
      data: {
        booking,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Update booking status specifically
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid status value",
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { "bookingDetails.status": status },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        status: "fail",
        message: "Booking not found",
      });
    }

    // Send status update email
    const email = new Email(
      {
        name: booking.customer.name,
        email: booking.customer.email,
      },
      `${process.env.FRONTEND_URL}/bookings/${booking._id}`
    );

    const statusMessages = {
      confirmed: "Your booking has been confirmed!",
      cancelled: "Your booking has been cancelled.",
      completed: "Your booking has been marked as completed.",
    };

    await email.sendBookingUpdate(
      booking,
      statusMessages[status] || "Your booking status has been updated."
    );

    res.status(200).json({
      status: "success",
      data: {
        booking,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Delete a booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({
        status: "fail",
        message: "Booking not found",
      });
    }

    // Send cancellation email
    const email = new Email(
      {
        name: booking.customer.name,
        email: booking.customer.email,
      },
      `${process.env.FRONTEND_URL}/bookings`
    );

    await email.send(
      "Booking Cancelled",
      `Hi ${
        booking.customer.name.split(" ")[0]
      }, your booking for ${formatBookingDate(
        booking.bookingDetails.preferredDate
      )} has been cancelled.`,
      { type: "error" }
    );

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Get bookings by status
exports.getBookingsByStatus = async (req, res) => {
  try {
    const bookings = await Booking.find({
      "bookingDetails.status": req.params.status,
    }).sort({ createdAt: -1 });
    res.status(200).json({
      status: "success",
      results: bookings.length,
      data: {
        bookings,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Get booking statistics
exports.getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: "$bookingDetails.status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const total = stats.reduce((sum, stat) => sum + stat.count, 0);

    res.status(200).json({
      status: "success",
      data: {
        total,
        stats,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Get upcoming bookings (within next 7 days)
exports.getUpcomingBookings = async (req, res) => {
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const bookings = await Booking.find({
      "bookingDetails.preferredDate": {
        $gte: new Date(),
        $lte: sevenDaysFromNow,
      },
      "bookingDetails.status": { $ne: "cancelled" },
    }).sort({ "bookingDetails.preferredDate": 1 });

    res.status(200).json({
      status: "success",
      results: bookings.length,
      data: {
        bookings,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};
