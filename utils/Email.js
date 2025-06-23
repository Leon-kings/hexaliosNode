// Email.js
const nodemailer = require('nodemailer');
const config = require('../config');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name?.split(' ')[0] || '';
    this.fullName = user.name || '';
    this.from = `Booking System <${config.email.from}>`;
    this.url = url;
    this.user = user;
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

  // Generate plain text version from HTML
  generatePlainText(html) {
    // Simple conversion - remove HTML tags and replace common elements
    return html
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ')      // Collapse multiple spaces
      .replace(/&nbsp;/g, ' ')   // Replace &nbsp;
      .replace(/&amp;/g, '&')    // Replace &amp;
      .replace(/&lt;/g, '<')    // Replace &lt;
      .replace(/&gt;/g, '>')    // Replace &gt;
      .replace(/&quot;/g, '"')  // Replace &quot;
      .trim();
  }

  // Generate email template
  generateEmailTemplate(title, message, options = {}) {
    const { type = 'info', actionUrl, actionText, secondaryActionUrl, secondaryActionText } = options;
    
    const colors = {
      success: '#4CAF50',
      error: '#F44336',
      info: '#2196F3',
      warning: '#FF9800',
      booking: '#9C27B0'
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="padding: 15px; margin-bottom: 15px; border-radius: 6px; background-color: ${colors[type] || colors.info}; color: white; font-weight: bold; text-align: center;">
          ${title}
        </div>
        <div style="padding: 0 15px 15px; color: #333;">
          ${message}
          ${actionUrl ? `
            <div style="margin-top: 20px; text-align: center;">
              <a href="${actionUrl}" style="display: inline-block; padding: 10px 20px; margin: 5px; background-color: ${colors[type] || colors.info}; color: white; text-decoration: none; border-radius: 4px;">
                ${actionText || 'Take Action'}
              </a>
              ${secondaryActionUrl ? `
                <a href="${secondaryActionUrl}" style="display: inline-block; padding: 10px 20px; margin: 5px; background-color: #607D8B; color: white; text-decoration: none; border-radius: 4px;">
                  ${secondaryActionText || 'Secondary Action'}
                </a>
              ` : ''}
            </div>
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
      const text = this.generatePlainText(html);
      
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text
      };

      await this.newTransport().sendMail(mailOptions);
    } catch (err) {
      console.error('Error sending email:', err);
      throw err;
    }
  }

  // Booking confirmation email
  async sendBookingConfirmation(bookingDetails) {
    const formattedDate = new Date(bookingDetails.preferredDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `
      <p>Hi ${this.firstName},</p>
      <p>Your booking for <strong>${bookingDetails.serviceTitle}</strong> has been received.</p>
      <p><strong>Date & Time:</strong> ${formattedDate}</p>
      <p><strong>Duration:</strong> ${bookingDetails.duration} minutes</p>
      ${bookingDetails.price ? `<p><strong>Price:</strong> $${bookingDetails.price.toFixed(2)}</p>` : ''}
      <p>We'll contact you shortly to confirm your appointment.</p>
    `;

    await this.send(
      'Booking Confirmation',
      message,
      { 
        type: 'booking',
        actionUrl: this.url || config.websiteUrl,
        actionText: 'View Your Booking'
      }
    );
  }

  // Booking status update email
  async sendBookingStatusUpdate(bookingDetails) {
    const formattedDate = new Date(bookingDetails.preferredDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusMessages = {
      confirmed: `Your booking for ${bookingDetails.serviceTitle} on ${formattedDate} has been confirmed.`,
      cancelled: `Your booking for ${bookingDetails.serviceTitle} on ${formattedDate} has been cancelled.`,
      completed: `Your booking for ${bookingDetails.serviceTitle} on ${formattedDate} has been marked as completed.`,
      pending: `Your booking for ${bookingDetails.serviceTitle} on ${formattedDate} is pending confirmation.`
    };

    const message = `
      <p>Hi ${this.firstName},</p>
      <p>${statusMessages[bookingDetails.status] || `The status of your booking for ${bookingDetails.serviceTitle} has been updated to ${bookingDetails.status}.`}</p>
      ${bookingDetails.status === 'cancelled' ? '<p>If you have any questions, please contact us.</p>' : ''}
    `;

    await this.send(
      `Booking ${bookingDetails.status.charAt(0).toUpperCase() + bookingDetails.status.slice(1)}`,
      message,
      { 
        type: bookingDetails.status === 'cancelled' ? 'error' : 'success',
        actionUrl: this.url || config.websiteUrl,
        actionText: 'View Your Booking'
      }
    );
  }

  // Admin booking notification
  static async sendAdminBookingNotification(booking) {
    try {
      const formattedDate = new Date(booking.preferredDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const bookingDate = new Date(booking.bookingDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const message = `
        <p>A new booking has been received:</p>
        <p><strong>Customer:</strong> ${booking.customerName}</p>
        <p><strong>Email:</strong> ${booking.customerEmail}</p>
        <p><strong>Phone:</strong> ${booking.customerPhone}</p>
        <p><strong>Service:</strong> ${booking.serviceTitle}</p>
        <p><strong>Preferred Date:</strong> ${formattedDate}</p>
        <p><strong>Booking Date:</strong> ${bookingDate}</p>
        <p><strong>Duration:</strong> ${booking.duration} minutes</p>
        ${booking.price ? `<p><strong>Price:</strong> $${booking.price.toFixed(2)}</p>` : ''}
        <p><strong>Status:</strong> ${booking.status}</p>
        <p><strong>Payment Status:</strong> ${booking.paymentStatus}</p>
        ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
      `;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="padding: 15px; margin-bottom: 15px; border-radius: 6px; background-color: #9C27B0; color: white; font-weight: bold; text-align: center;">
            New Booking Request
          </div>
          <div style="padding: 0 15px 15px; color: #333;">
            ${message}
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <a href="${config.adminDashboardUrl}/bookings" style="display: inline-block; padding: 10px 20px; background-color: #9C27B0; color: white; text-decoration: none; border-radius: 4px;">
              View in Dashboard
            </a>
            <a href="mailto:${booking.customerEmail}" style="display: inline-block; padding: 10px 20px; margin-left: 10px; background-color: #607D8B; color: white; text-decoration: none; border-radius: 4px;">
              Reply to Customer
            </a>
          </div>
        </div>
      `;

      // Generate plain text version
      const text = `New Booking Request\n\n` +
        `Customer: ${booking.customerName}\n` +
        `Email: ${booking.customerEmail}\n` +
        `Phone: ${booking.customerPhone}\n` +
        `Service: ${booking.serviceTitle}\n` +
        `Preferred Date: ${formattedDate}\n` +
        `Booking Date: ${bookingDate}\n` +
        `Duration: ${booking.duration} minutes\n` +
        (booking.price ? `Price: $${booking.price.toFixed(2)}\n` : '') +
        `Status: ${booking.status}\n` +
        `Payment Status: ${booking.paymentStatus}\n` +
        (booking.notes ? `Notes: ${booking.notes}\n` : '') +
        `\nView in Dashboard: ${config.adminDashboardUrl}/bookings\n` +
        `Reply to Customer: mailto:${booking.customerEmail}`;

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
        subject: `New Booking: ${booking.serviceTitle} - ${formattedDate}`,
        html,
        text
      });

    } catch (error) {
      console.error('Error sending admin booking notification:', error);
      throw error;
    }
  }

  // Payment confirmation email
  async sendPaymentConfirmation(bookingDetails) {
    const formattedDate = new Date(bookingDetails.preferredDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `
      <p>Hi ${this.firstName},</p>
      <p>Your payment for booking <strong>${bookingDetails.serviceTitle}</strong> has been received.</p>
      <p><strong>Date & Time:</strong> ${formattedDate}</p>
      <p><strong>Amount Paid:</strong> $${bookingDetails.amount.toFixed(2)}</p>
      <p>Thank you for your payment. Your booking is now confirmed.</p>
    `;

    await this.send(
      'Payment Confirmation',
      message,
      { 
        type: 'success',
        actionUrl: this.url || config.websiteUrl,
        actionText: 'View Your Booking'
      }
    );
  }
}

module.exports = Email;