const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true 
  },
  balance: {
    type: Number,
    required: true,
    default: 0
  },
  credit: {
    type: Number,
    default: 0
  },
  debit: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Wallet', walletSchema);
