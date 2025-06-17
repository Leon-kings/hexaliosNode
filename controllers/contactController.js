const Contact = require('../models/Contact');
const Email = require('../utils/Email');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.submitContactForm = catchAsync(async (req, res, next) => {
  const { name, email, subject, message } = req.body;

  // Create contact record
  const contact = await Contact.create({
    name,
    email,
    subject,
    message,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Send email to admin
  await Email.sendAdminContactNotification({
    name,
    email,
    subject,
    message,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Send confirmation email to user
  const userEmail = new Email({ email, name });
  await userEmail.sendContactConfirmation();

  res.status(201).json({
    status: 'success',
    message: 'Thank you for contacting us! We will get back to you soon.'
  });
});

exports.getContactStatistics = catchAsync(async (req, res, next) => {
  const stats = await Contact.getStatistics();
  
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// Admin only endpoints
exports.getAllContacts = catchAsync(async (req, res, next) => {
  const contacts = await Contact.find().sort('-createdAt');
  
  res.status(200).json({
    status: 'success',
    results: contacts.length,
    data: {
      contacts
    }
  });
});

exports.updateContactStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { 
      status,
      respondedAt: status === 'responded' ? Date.now() : undefined 
    },
    { new: true, runValidators: true }
  );

  if (!contact) {
    return next(new AppError('No contact found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      contact
    }
  });
});