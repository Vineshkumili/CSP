// Load environment variables
require('dotenv').config();

// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize express app
const app = express();

// Import complaint routes
const complaintRoutes = require('./routes/complaints');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static images from /uploads
app.use('/uploads', express.static('uploads'));

// Serve static frontend files
const path = require('path');
app.use(express.static(path.join(__dirname, 'frontend')));

// Default route to load home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/csphome.html'));
});

// Use complaints route
app.use('/api/complaints', complaintRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
