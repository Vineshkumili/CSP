const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// POST complaint route
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { category, description } = req.body;
    const proofImage = req.file ? req.file.filename : null;

    // Save complaint to database
    const newComplaint = new Complaint({
      category,
      description,
      proofImage,
    });

    await newComplaint.save();

    // Email configuration using dotenv variables
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
      }
    });

    // Attachment path
    const imagePath = proofImage ? path.join(__dirname, '..', 'uploads', proofImage) : null;

    // Email options
    const mailOptions = {
      from: process.env.EMAIL,
      to: process.env.EMAIL, // Or any recipient
      subject: 'New Complaint Submitted',
      text: `A new complaint was submitted.

Category: ${category}
Description: ${description}
Image Attached: ${proofImage ? 'Yes' : 'No'}`,
      attachments: proofImage ? [{
        filename: proofImage,
        path: imagePath
      }] : []
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    // Respond to frontend
    res.status(201).json({ message: 'Complaint saved and email sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save complaint or send email' });
  }
});

module.exports = router;
