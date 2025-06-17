const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
// const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);
router.get('/stats', productController.getProductStats);

// Protected admin routes
// router.use(protect, authorize('admin'));

router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;