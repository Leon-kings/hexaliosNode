const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');
const config = require('../config');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name?.split(' ')[0] || '';
    this.from = `Admin <${config.email.from}>`;
    this.url = url;
  }

  // Create transporter (now using config-based settings)
  newTransport() {
    return nodemailer.createTransport({
      service: config.email.service || 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
  }

  // Render HTML from Pug template
  async renderTemplate(template, data = {}) {
    try {
      return pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
        firstName: this.firstName,
        ...data
      });
    } catch (err) {
      console.error('Error rendering email template:', err);
      throw err;
    }
  }

  // Send email with Pug template
  async send(template, subject, templateData = {}) {
    const html = await this.renderTemplate(template, templateData);
    
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html)
    };

    await this.newTransport().sendMail(mailOptions);
  }

  // Template-based emails
  async sendWelcome() {
    await this.send('welcome', 'Welcome to our platform!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for 10 minutes)',
      { url: this.url }
    );
  }

  // Order-related emails (now using the same transport system)
  static async sendOrderConfirmation(order) {
    try {
      const transporter = nodemailer.createTransport({
        service: config.email.service || 'gmail',
        auth: {
          user: config.email.user,
          pass: config.email.password
        }
      });

      const mailOptions = {
        from: config.email.from,
        to: order.customer.email,
        subject: `Order Confirmation #${order._id}`,
        html: `
          <h1>Thank you for your order!</h1>
          <p>Your order #${order._id} has been received and is being processed.</p>
          <h2>Order Summary</h2>
          <ul>
            ${order.products.map(item => `
              <li>
                ${item.name} (${item.size}) - ${item.quantity} x $${item.price} = $${item.quantity * item.price}
              </li>
            `).join('')}
          </ul>
          <p><strong>Total: $${order.totalPrice}</strong></p>
          <p>Shipping address: ${order.customer.address}</p>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      // Don't fail the order if email fails
    }
  }

  static async sendAdminNotification(order) {
    try {
      const transporter = nodemailer.createTransport({
        service: config.email.service || 'gmail',
        auth: {
          user: config.email.user,
          pass: config.email.password
        }
      });

      const mailOptions = {
        from: config.email.from,
        to: config.adminEmail,
        subject: `New Order Received #${order._id}`,
        html: `
          <h1>New Order Notification</h1>
          <p>A new order has been placed by ${order.customer.name}.</p>
          <h2>Order Details</h2>
          <ul>
            ${order.products.map(item => `
              <li>
                ${item.name} (${item.size}) - ${item.quantity} x $${item.price} = $${item.quantity * item.price}
              </li>
            `).join('')}
          </ul>
          <p><strong>Total: $${order.totalPrice}</strong></p>
          <p>Customer email: ${order.customer.email}</p>
          <p>Shipping address: ${order.customer.address}</p>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending admin notification email:', error);
    }
  }
}

// Helper functions for backward compatibility
const sendRegistrationEmail = async (user) => {
  const email = new Email(user);
  await email.sendWelcome();
};

const sendAdminNotification = async (user) => {
  const email = new Email(user);
  await email.sendAdminNotification();
};

module.exports = {
  Email,
  sendRegistrationEmail,
  sendAdminNotification,
  sendOrderConfirmation: Email.sendOrderConfirmation,
  sendAdminNotificationEmail: Email.sendAdminNotification
};