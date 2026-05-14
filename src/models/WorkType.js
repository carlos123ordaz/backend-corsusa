const mongoose = require('mongoose');

const workTypeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 5,
        },
        label: {
            type: String,
            required: true,
            trim: true,
        },
        color: {
            type: String,
            required: true,
            trim: true,
        },
        areaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Area',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Unicidad por código dentro del mismo área
workTypeSchema.index({ code: 1, areaId: 1 }, { unique: true });

module.exports = mongoose.model('WorkType', workTypeSchema);