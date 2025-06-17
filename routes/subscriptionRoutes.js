const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const router = express.Router();

router.post('/', subscriptionController.createSubscription);
router.get('/verify/:token', subscriptionController.verifySubscription);
router.get('/stats/monthly', subscriptionController.getMonthlyStats);

router
  .route('/')
  .get(subscriptionController.getAllSubscriptions);

router
  .route('/:id')
  .get(subscriptionController.getSubscription)
  .patch(subscriptionController.updateSubscription)
  .delete(subscriptionController.deleteSubscription);

module.exports = router;