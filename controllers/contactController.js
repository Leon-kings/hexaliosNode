const Contact = require('../models/Contact');
const { sendAdminContactNotification } = require('../services/emailService');

// CREATE - Submit contact form
exports.createContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    const newContact = new Contact({ 
      name, 
      email, 
      subject, 
      message,
      ipAddress,
      userAgent
    });
    await newContact.save();

    // Send emails
    try {
      // Send confirmation to user
    
      
      // Send notification to admin
      await sendAdminContactNotification({
        name,
        email,
        subject,
        message,
        ipAddress,
        createdAt: newContact.createdAt
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      data: newContact,
      message: 'Thank you for your message!'
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// READ - Get all contacts (for admin)
exports.getAllContacts = async (req, res) => {
  try {
    const { status, sort, search } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'updated') {
      sortOption = { updatedAt: -1 };
    }

    const contacts = await Contact.find(query).sort(sortOption);
    
    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// READ - Get single contact
exports.getContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// UPDATE - Update contact status
exports.updateContact = async (req, res) => {
  try {
    const { status } = req.body;
    
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Send status update email if status changed to resolved
    if (status === 'resolved') {
      try {
        await sendContactEmail({
          name: contact.name,
          email: contact.email,
          subject: `Update: ${contact.subject}`,
          message: `We're happy to inform you that your inquiry has been resolved. Thank you for contacting us.`
        });
      } catch (emailError) {
        console.error('Status update email failed:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      data: contact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE - Remove contact
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET Statistics
exports.getStatistics = async (req, res) => {
  try {
    const stats = await Contact.getStatistics();
    
    // Additional stats for dashboard
    const last7Days = await Contact.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    const resolvedCount = stats.stats.find(s => s.status === 'resolved')?.count || 0;
    const responseRate = stats.total > 0 
      ? Math.round((resolvedCount / stats.total) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        last7Days,
        responseRate
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};