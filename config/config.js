// config.js
require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  mongoURI: process.env.MONGODB_URI ,
  mongoOptions: {
    retryWrites: true,
    w: 'majority'
  },
  
  // Stripe Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiVersion: '2027-10-16' // Using fixed API version for stability
  },
  
  // Security Configuration
  corsOptions: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // API Configuration
  api: {
    prefix: '/api/v1',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  
  // JWT Configuration (if using auth)
  jwt: {
    secret: process.env.JWT_SECRET ,
    expiresIn: '24h'
  }
};

// Validation for required environment variables
const requiredEnvVars = ['MONGODB_URI', 'STRIPE_SECRET_KEY'];
requiredEnvVars.forEach(variable => {
  if (!process.env[variable] && config.env === 'production') {
    throw new Error(`❌ Missing required environment variable: ${variable}`);
  }
});

// Environment-specific configurations
if (config.env === 'development') {
  config.mongoOptions.debug = true;
  console.log('⚠️  Running in development mode');
}

if (config.env === 'production') {
  config.mongoOptions.ssl = true;
  config.mongoOptions.sslValidate = true;
}

module.exports = config;