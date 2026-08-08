const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// POST complaint route
router.post('/', upload.single('image'), async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        error: `Database is not connected (readyState=${mongoose.connection.readyState}). Please check MONGO_URI in Render Environment variables.`
      });
    }

    const { category, description } = req.body;
    const proofImage = req.file ? req.file.filename : null;

    // Save complaint to database
    const newComplaint = new Complaint({
      category,
      description,
      proofImage,
    });

    await newComplaint.save();

    // Send email notification if credentials are present
    let emailStatus = 'skipped';
    const emailUser = (process.env.EMAIL || '').trim();
    const emailPass = (process.env.APP_PASSWORD || '').trim();

    if (emailUser && emailPass) {
      try {
        console.log(`Attempting to send email from ${emailUser} to ${emailUser}...`);
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        });

        const imagePath = proofImage ? path.join(uploadDir, proofImage) : null;

        const mailOptions = {
          from: emailUser,
          to: emailUser,
          subject: 'New Complaint Submitted',
          text: `A new complaint was submitted.

Category: ${category}
Description: ${description}
Image Attached: ${proofImage ? 'Yes' : 'No'}`,
          attachments: proofImage && fs.existsSync(imagePath) ? [{
            filename: proofImage,
            path: imagePath
          }] : []
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully! MessageId:', info.messageId);
        emailStatus = 'sent';
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError.message);
        emailStatus = `failed (${emailError.message})`;
      }
    } else {
      console.log('⚠️ Email notification skipped: EMAIL or APP_PASSWORD missing.');
    }

    // Respond to frontend
    res.status(201).json({ 
      message: 'Complaint saved successfully!',
      emailStatus: emailStatus
    });
  } catch (err) {
    console.error('Complaint save error:', err);
    res.status(500).json({ error: 'Failed to save complaint: ' + err.message });
  }
});

module.exports = router;
