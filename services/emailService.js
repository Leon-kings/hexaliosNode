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
    this.user = user; // Store user for booking methods
  }

  // Create transporter
  newTransport() {
    if (!config.email || !config.email.user || !config.email.password) {
      throw new Error('Email configuration is incomplete');
    }
    
    return nodemailer.createTransport({
      service: config.email.service || 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
  }

  // Generate email template (used for both toast-style and subscription emails)
  generateEmailTemplate(title, message, options = {}) {
    const { type = 'info', actionUrl, actionText } = options;
    
    const colors = {
      success: '#4CAF50',
      error: '#F44336',
      info: '#2196F3',
      warning: '#FF9800'
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="padding: 15px; margin-bottom: 15px; border-radius: 6px; background-color: ${colors[type] || colors.info}; color: white; font-weight: bold;">
          ${title}
        </div>
        <div style="padding: 0 15px 15px; color: #333;">
          <p>${message}</p>
          ${actionUrl ? `
            <a href="${actionUrl}" style="display: inline-block; padding: 10px 20px; margin-top: 10px; background-color: ${colors[type] || colors.info}; color: white; text-decoration: none; border-radius: 4px;">
              ${actionText || 'Take Action'}
            </a>
          ` : ''}
        </div>
        ${this.url ? `
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #777;">
            <a href="${this.url}" style="color: #777;">View in browser</a>
          </div>
        ` : `
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #777;">
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `}
      </div>
    `;
  }

  // Send email with generated template
  async send(subject, message, options = {}) {
    try {
      if (!this.to) throw new Error('No recipient specified');
      
      const html = this.generateEmailTemplate(subject, message, options);
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: convert(html)
      };

      await this.newTransport().sendMail(mailOptions);
    } catch (err) {
      console.error('Error sending email:', err);
      throw err;
    }
  }

  // Welcome email
  async sendWelcome() {
    await this.send(
      'Welcome to our platform!',
      `Hi ${this.firstName}, thank you for registering with us. We're excited to have you on board!`,
      { type: 'success' }
    );
  }

  // Password reset email
  async sendPasswordReset() {
    await this.send(
      'Password Reset Request',
      `Hi ${this.firstName}, we received a request to reset your password. Click below to set a new password.`,
      { 
        type: 'warning',
        actionUrl: this.url,
        actionText: 'Reset Password'
      }
    );
  }

  // Subscription confirmation email
  async sendSubscriptionConfirmation(verificationUrl) {
    await this.send(
      'Please confirm your subscription',
      `Hi ${this.firstName}, thank you for subscribing to our newsletter! Please confirm your email address to start receiving updates.`,
      {
        type: 'success',
        actionUrl: verificationUrl,
        actionText: 'Confirm Subscription'
      }
    );
  }

  // Booking confirmation email
  async sendBookingConfirmation() {
    const formattedDate = new Date(this.user.date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    await this.send(
      'Booking Confirmation',
      `Hi ${this.firstName}, your booking for ${formattedDate} has been received. We'll contact you shortly to confirm.`,
      { 
        type: 'success',
        actionUrl: this.url || config.websiteUrl,
        actionText: 'View Your Bookings'
      }
    );
  }

  // Contact form confirmation email
  async sendContactConfirmation() {
    await this.send(
      'We Received Your Message',
      `Hi ${this.firstName}, thank you for contacting us. We've received your message and will get back to you soon.`,
      { type: 'info' }
    );
  }

  // Order confirmation email
  static async sendOrderConfirmation(order) {
    try {
      if (!order || !order.customer || !order.customer.email) {
        throw new Error('Invalid order data - missing customer email');
      }

      const email = new Email(order.customer);
      
      const itemsHtml = (order.products || []).map(item => `
        <div style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
          <span>${item.name || 'Unnamed Product'}${item.size ? ` (${item.size})` : ''} × ${item.quantity || 1}</span>
          <span>$${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</span>
        </div>
      `).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="padding: 15px; margin-bottom: 15px; border-radius: 6px; background-color: #4CAF50; color: white; font-weight: bold;">
            Order Confirmation #${order._id || 'N/A'}
          </div>
          <div style="padding: 0 15px 15px; color: #333;">
            <p>Thank you for your order, ${order.customer.name?.split(' ')[0] || 'Customer'}!</p>
            <h3 style="margin: 20px 0 10px 0;">Order Summary</h3>
            ${itemsHtml}
            <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #eee; font-weight: bold; display: flex; justify-content: space-between;">
              <span>Total:</span>
              <span>$${(order.totalPrice || 0).toFixed(2)}</span>
            </div>
            <div style="margin-top: 20px;">
              <h3 style="margin-bottom: 10px;">Shipping Information</h3>
              <p>${order.customer.address || 'No address provided'}</p>
            </div>
          </div>
        </div>
      `;

      await email.newTransport().sendMail({
        from: config.email.from,
        to: order.customer.email,
        subject: `Order Confirmation #${order._id || 'N/A'}`,
        html,
        text: convert(html)
      });
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      throw error;
    }
  }

  // Admin notification email
  static async sendAdminNotification(userOrOrder) {
    try {
      // Determine if this is a user registration or order notification
      const isOrder = userOrOrder.products !== undefined;
      
      if (isOrder) {
        const order = userOrOrder;
        if (!order._id) throw new Error('Missing order ID');
        if (!order.customer || !order.customer.email) throw new Error('Missing customer information');
        
        const itemsHtml = (order.products || []).map(item => `
          <div style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
            <span>${item.name || 'Unnamed Product'}${item.size ? ` (${item.size})` : ''} × ${item.quantity || 1}</span>
            <span>$${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</span>
          </div>
        `).join('');

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="padding: 15px; margin-bottom: 15px; border-radius: 6px; background-color: #2196F3; color: white; font-weight: bold;">
              New Order Notification #${order._id}
            </div>
            <div style="padding: 0 15px 15px; color: #333;">
              <p><strong>Customer:</strong> ${order.customer.name || 'No name'} (${order.customer.email})</p>
              <h3 style="margin: 20px 0 10px 0;">Order Details</h3>
              ${itemsHtml}
              <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #eee; font-weight: bold; display: flex; justify-content: space-between;">
                <span>Total:</span>
                <span>$${(order.totalPrice || 0).toFixed(2)}</span>
              </div>
              <div style="margin-top: 20px;">
                <h3 style="margin-bottom: 10px;">Shipping Address</h3>
                <p>${order.customer.address || 'No address provided'}</p>
              </div>
            </div>
          </div>
        `;

        await nodemailer.createTransport({
          service: config.email.service || 'gmail',
          auth: {
            user: config.email.user,
            pass: config.email.password
          }
        }).sendMail({
          from: config.email.from,
          to: config.adminEmail,
          subject: `New Order #${order._id}`,
          html,
          text: convert(html)
        });
      } else {
        // Handle user registration notification
        const user = userOrOrder;
        if (!user.email) throw new Error('Missing user email');
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="padding: 15px; margin-bottom: 15px; border-radius: 6px; background-color: #4CAF50; color: white; font-weight: bold;">
              New User Registration
            </div>
            <div style="padding: 0 15px 15px; color: #333;">
              <p><strong>Name:</strong> ${user.name || 'No name provided'}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        `;

        await nodemailer.createTransport({
          service: config.email.service || 'gmail',
          auth: {
            user: config.email.user,
            pass: config.email.password
          }
        }).sendMail({
          from: config.email.from,
          to: config.adminEmail,
          subject: 'New User Registration',
          html,
          text: convert(html)
        });
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
      throw error;
    }
  }

  // Admin booking notification
  static async sendAdminBookingNotification(booking) {
    try {
      const formattedDate = new Date(booking.date).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="padding: 15px; margin-bottom: 15px; border-radius: 6px; background-color: #2196F3; color: white; font-weight: bold;">
            New Booking Request
          </div>
          <div style="padding: 0 15px 15px; color: #333;">
            <p><strong>Customer:</strong> ${booking.name}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            <p><strong>Phone:</strong> ${booking.phone}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
            <p><strong>Status:</strong> ${booking.status}</p>
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <a href="${config.adminDashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px;">
              View in Dashboard
            </a>
          </div>
        </div>
      `;

      const transporter = nodemailer.createTransport({
        service: config.email.service,
        auth: {
          user: config.email.user,
          pass: config.email.password
        }
      });

      await transporter.sendMail({
        from: config.email.from,
        to: config.adminEmail,
        subject: `New Booking: ${formattedDate}`,
        html,
        text: convert(html)
      });

    } catch (error) {
      console.error('Error sending admin notification:', error);
      throw error;
    }
  }

  // Admin contact form notification
  static async sendAdminContactNotification(contact) {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="padding: 15px; margin-bottom: 15px; border-radius: 6px; background-color: #2196F3; color: white; font-weight: bold;">
            New Contact Form Submission
          </div>
          <div style="padding: 0 15px 15px; color: #333;">
            <p><strong>From:</strong> ${contact.name} (${contact.email})</p>
            <p><strong>Subject:</strong> ${contact.subject}</p>
            <p><strong>Message:</strong></p>
            <div style="padding: 10px; background-color: #fff; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0;">
              ${contact.message}
            </div>
            <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>IP Address:</strong> ${contact.ipAddress}</p>
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <a href="${config.adminDashboardUrl}/contacts" style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px;">
              View in Dashboard
            </a>
          </div>
        </div>
      `;

      await nodemailer.createTransport({
        service: config.email.service || 'gmail',
        auth: {
          user: config.email.user,
          pass: config.email.password
        }
      }).sendMail({
        from: config.email.from,
        to: config.adminEmail,
        subject: `New Contact: ${contact.subject}`,
        html,
        text: convert(html)
      });
    } catch (error) {
      console.error('Error sending contact notification:', error);
      throw error;
    }
  }
}

// Helper functions
const sendRegistrationEmail = async (user) => {
  try {
    if (!user?.email) {
      console.error('Cannot send registration email - no user email provided');
      return;
    }
    const email = new Email(user);
    await email.sendWelcome();
  } catch (error) {
    console.error('Error sending registration email:', error.message);
    // Don't throw so registration can continue
  }
};

const sendSubscriptionConfirmation = async (subscription, verificationUrl) => {
  try {
    const email = new Email(subscription, verificationUrl);
    await email.sendSubscriptionConfirmation(verificationUrl);
  } catch (error) {
    console.error('Error sending subscription confirmation:', error);
  }
};

module.exports = {
  Email,
  sendRegistrationEmail,
  sendSubscriptionConfirmation,
  sendOrderConfirmation: Email.sendOrderConfirmation,
  sendAdminNotificationEmail: Email.sendAdminNotification,
  sendAdminBookingNotification: Email.sendAdminBookingNotification,
  sendAdminContactNotification: Email.sendAdminContactNotification
};