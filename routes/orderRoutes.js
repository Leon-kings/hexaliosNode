const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');


// Create a new order
router.post('/', orderController.createOrder);

// Get order statistics
router.get('/statistics', orderController.getOrderStatistics);

// Get all orders
router.get('/', orderController.getAllOrders);

// Get single order
router.get('/:id', orderController.getOrderById);

module.exports = router;