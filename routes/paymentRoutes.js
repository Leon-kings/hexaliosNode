const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
// const authController = require('../controllers/authController');

// router.use(authController.protect);

// Payment routes tied to bookings
router.post('/bookings/:bookingId/payment', paymentController.processPayment);
router.get('/bookings/:bookingId/payment', paymentController.getPayment);
router.patch('/bookings/:bookingId/payment', paymentController.updatePaymentStatus);
router.post('/bookings/:bookingId/payment/refund', paymentController.refundPayment);

module.exports = router;