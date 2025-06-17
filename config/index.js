module.exports = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGODB_URI ,
  email: {
    user: process.env.EMAIL_USER ,
    password: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'LD'
  },
  adminEmail: process.env.ADMIN_EMAIL ,
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY 
  },
  jwtSecret: process.env.JWT_SECRET 
};