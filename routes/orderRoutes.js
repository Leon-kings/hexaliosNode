const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
// const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/', orderController.createOrder);

// Protected admin routes

// router.use(protect, authorize('admin'));
router.get('/', orderController.getOrders);
router.get('/stats', orderController.getOrderStats);
// Add other CRUD routes as needed

module.exports = router;