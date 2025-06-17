const { body, validationResult } = require('express-validator');

exports.validateOrder = [
  body('customer.name').notEmpty().withMessage('Customer name is required'),
  body('customer.email').isEmail().withMessage('Valid email is required'),
  body('customer.address').notEmpty().withMessage('Address is required'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  body('products').isArray({ min: 1 }).withMessage('At least one product is required'),
  body('products.*.productId').notEmpty().withMessage('Product ID is required'),
  body('products.*.name').notEmpty().withMessage('Product name is required'),
  body('products.*.price').isNumeric().withMessage('Valid price is required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('totalPrice').isNumeric().withMessage('Valid total price is required'),
  body('commodityPrice').isNumeric().withMessage('Valid commodity price is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array().map(err => err.msg) 
      });
    }
    next();
  }
];