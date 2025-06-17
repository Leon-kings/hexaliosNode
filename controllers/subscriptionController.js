const Subscription = require('../models/subscriptionModel');
const AppError = require('../utils/AppError');
const { sendSubscriptionConfirmation } = require('../services/emailService');
const crypto = require('crypto');

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

exports.createSubscription = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    // Check if email exists
    const existingSub = await Subscription.findOne({ email });
    if (existingSub) {
      return next(new AppError('This email is already subscribed', 400));
    }

    const verificationToken = generateVerificationToken();
    const newSubscription = await Subscription.create({
      name,
      email,
      verificationToken
    });

    // Send confirmation email
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/subscriptions/verify/${verificationToken}`;
    await sendSubscriptionConfirmation(newSubscription, verificationUrl);

    res.status(201).json({
      status: 'success',
      message: 'Confirmation email sent',
      data: {
        subscription: {
          id: newSubscription._id,
          name: newSubscription.name,
          email: newSubscription.email
        }
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('Email is already subscribed', 400));
    }
    next(err);
  }
};

exports.verifySubscription = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    const subscription = await Subscription.findOneAndUpdate(
      { verificationToken: token },
      { isVerified: true, verificationToken: null },
      { new: true }
    );

    if (!subscription) {
      return next(new AppError('Invalid verification token', 400));
    }

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.getMonthlyStats = async (req, res, next) => {
  try {
    const stats = await Subscription.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalSubscriptions: { $sum: 1 },
          verifiedSubscriptions: {
            $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          month: "$_id"
        }
      },
      {
        $project: {
          _id: 0
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: subscriptions.length,
      data: {
        subscriptions
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return next(new AppError('No subscription found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!subscription) {
      return next(new AppError('No subscription found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.id);

    if (!subscription) {
      return next(new AppError('No subscription found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};