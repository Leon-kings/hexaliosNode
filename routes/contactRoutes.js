const express = require('express');
const contactController = require('../controllers/contactController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/', contactController.submitContactForm);
router.get('/stats', contactController.getContactStatistics);

// Protected admin routes
router.use(authController.protect, authController.restrictTo('admin'));

router.get('/', contactController.getAllContacts);
router.patch('/:id', contactController.updateContactStatus);

module.exports = router;