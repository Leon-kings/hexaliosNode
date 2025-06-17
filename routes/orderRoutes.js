const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { validateOrder } = require('../middlewares/validationMiddleware');

// Create a new order
router.post('/', validateOrder, orderController.createOrder);

// Get order statistics
router.get('/statistics', orderController.getOrderStatistics);

// Get all orders
router.get('/', orderController.getAllOrders);

// Get single order
router.get('/:id', orderController.getOrderById);

module.exports = router;