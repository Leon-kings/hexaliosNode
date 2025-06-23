const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
// const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/', contactController.createContact);

// Protected admin routes
// router.use(protect, authorize('admin'));

router.get('/', contactController.getAllContacts);
router.get('/stats', contactController.getStatistics);
router.get('/:id', contactController.getContact);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;