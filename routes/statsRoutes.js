const express = require('express');
const statsController = require('../controllers/statsController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.get('/monthly/:year/:month', statsController.getMonthlyStats);
router.get('/yearly/:year', statsController.getYearlyStats);
router.get('/user-stats', statsController.getUserStats);

module.exports = router;