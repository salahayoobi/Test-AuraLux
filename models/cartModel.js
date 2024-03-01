const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        default: 1
      },
      unitPrice: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      maxQuantity: {
        type: Number,
        required: true,
        default: 5
      }
    }
  ],
  totalPrice: {
    type: Number,
    required: true,
    default: 0
  }
});

module.exports = mongoose.model('Cart', cartSchema);