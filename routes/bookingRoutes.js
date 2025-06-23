const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
// const { protect, restrictTo } = require('../middlewares/auth');

// Public routes
router.post('/', bookingController.createBooking);
router.get('/:id', bookingController.getBooking);

// Admin-protected routes
// router.use(protect, restrictTo('admin'));
router.get('/', bookingController.getAllBookings);
router.patch('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;