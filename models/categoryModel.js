const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    offerPercentage: {
        type: Number,
        required: true
    },
    offerExpiryDate: {
        type: Date,
        default: Date.now
    },
    isListed: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('Category', categorySchema);