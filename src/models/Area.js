const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        shortName: String,
        description: {
            type: String,
            trim: true,
        },
        color: {
            type: String,
            default: '#6b7280',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Area', areaSchema);