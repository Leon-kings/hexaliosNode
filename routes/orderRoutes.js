const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// CRUD operations
router.post('/', orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

// Statistics
router.get('/stats/payments', orderController.getPaymentStats);
router.get('/stats/revenue', orderController.getDailyRevenue);

module.exports = router;