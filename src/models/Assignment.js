const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        workTypeCode: {
            type: String,
            required: true,
        },
        areaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Area',
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        month: {
            type: Number,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Índices para búsquedas rápidas
assignmentSchema.index({ areaId: 1, userId: 1, month: 1, year: 1 });
assignmentSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);