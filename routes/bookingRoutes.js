const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/', bookingController.createBooking);

// Protected routes (require authentication)
router.use(authController.protect);

router.get('/my-bookings', bookingController.getUserBookings);
router.get('/upcoming', bookingController.getUpcomingBookings);

// Admin-only routes
router.use(authController.restrictTo('admin'));

router.get('/', bookingController.getAllBookings);
router.get('/stats', bookingController.getBookingStats);
router.get('/trends', bookingController.getBookingTrends);
router.get('/user-stats/:userId', bookingController.getUserBookingStats);
router.get('/:id', bookingController.getBooking);
router.patch('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;