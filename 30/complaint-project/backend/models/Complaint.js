const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  category: String,
  description: String,
  proofImage: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
