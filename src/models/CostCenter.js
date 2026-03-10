const mongoose = require('mongoose');

const costCenterSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'inactive']
    },
    level: {
        type: Number,
        required: true,
        enum: [1, 2, 3],
        min: 1,
        max: 3
    },
    parent_code: {
        type: String,
        default: null,
        trim: true
    }
}, {
    timestamps: true // Crea automáticamente createdAt y updatedAt
});

// Índice para mejorar las búsquedas por parent_code
costCenterSchema.index({ parent_code: 1, level: 1 });
costCenterSchema.index({ code: 1 });

const CostCenter = mongoose.model('CostCenter', costCenterSchema);

module.exports = CostCenter;