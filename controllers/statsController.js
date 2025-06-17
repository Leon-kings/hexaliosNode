const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { getMonthlyStats, getYearlyStats } = require('../services/emailService');

exports.getUserStats = catchAsync(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: { $month: '$createdAt' },
        numUsers: { $sum: 1 },
        avgLoginCount: { $avg: '$loginCount' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: { _id: 0 }
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
});

exports.getMonthlyStats = catchAsync(async (req, res, next) => {
  const { year, month } = req.params;
  const stats = await getMonthlyStats(year, month);
  
  res.status(200).json({
    status: 'success',
    data: stats
  });
});

exports.getYearlyStats = catchAsync(async (req, res, next) => {
  const { year } = req.params;
  const stats = await getYearlyStats(year);
  
  res.status(200).json({
    status: 'success',
    data: stats
  });
});