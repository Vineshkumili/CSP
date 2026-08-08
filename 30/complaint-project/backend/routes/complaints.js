const express = require('express');
const router = express.Router();
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
    if (process.env.EMAIL && process.env.APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL,
            pass: process.env.APP_PASSWORD
          }
        });

        const imagePath = proofImage ? path.join(uploadDir, proofImage) : null;

        const mailOptions = {
          from: process.env.EMAIL,
          to: process.env.EMAIL,
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

        await transporter.sendMail(mailOptions);
        emailStatus = 'sent';
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        emailStatus = `failed (${emailError.message})`;
      }
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
