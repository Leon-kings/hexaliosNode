const nodemailer = require('nodemailer');

class Email {
  newTransport() {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465, // Use 465 for SSL (or 587 with secure: false)
      secure: true,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
}