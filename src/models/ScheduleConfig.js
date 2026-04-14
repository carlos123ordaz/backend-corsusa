const mongoose = require('mongoose');

const timePeriodSchema = new mongoose.Schema({
    start: {
        type: String,
        required: true,
    },
    end: {
        type: String,
        required: true,
    },
}, { _id: false });

const dayScheduleSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true,
    },
    periods: [timePeriodSchema],
    isWorkday: {
        type: Boolean,
        default: false,
    },
    totalHours: {
        type: Number,
        default: 0,
    },
}, { _id: false });

const scheduleConfigSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        color: {
            type: String,
            default: '#FFC0CB',
        },
        flexibleMinutes: {
            type: Number,
            default: 30,
        },
        isFlexible: {
            type: Boolean,
            default: true,
        },
        remoteDays: {
            type: [String],
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            default: [],
        },
        weekSchedule: [dayScheduleSchema],
        totalWeeklyHours: {
            type: Number,
            required: true,
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// ✅ ÍNDICE ÚNICO: Solo puede haber un horario activo por usuario
// Esto previene duplicados a nivel de base de datos
scheduleConfigSchema.index(
    { userId: 1, active: 1 },
    {
        unique: true,
        partialFilterExpression: { active: true },
        name: 'unique_active_schedule_per_user'
    }
);

// Índice para búsquedas rápidas
scheduleConfigSchema.index({ userId: 1 });
scheduleConfigSchema.index({ active: 1 });

module.exports = mongoose.model('ScheduleConfig', scheduleConfigSchema);
