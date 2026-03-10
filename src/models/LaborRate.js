// models/LaborRate.js
const { Schema, model } = require('mongoose');

const ServiceRateSchema = Schema({
    code: String,
    label: String,
    cost_hh: Number,
    sale_hh: Number,
    profit: Number,
    hours_per_day: Number,
    factor: Number
}, { _id: false });

const ProjectRateSchema = Schema({
    position: String,
    salary_usd: Number,
    normal_hh: Number,
    overtime_25: Number,
    overtime_35: Number,
    sunday_holiday: Number,
    transit_hh: Number,
    daily_rate: Number
}, { _id: false });

const LaborRateSchema = Schema({
    type: {
        type: String,
        required: true,
        enum: ['service', 'project']
    },

    effective_date: {
        type: Date,
        required: true
    },

    exchange_rate: {
        type: Number,
        required: true
    },

    // Costos de personal base (para servicios)
    staff_costs: {
        total_annual_pen: Number,
        working_days_month: Number,
        months: Number,
        total_days: Number,
        cost_per_day_usd: Number,
        cost_per_hour_usd: Number,
        available_hours: Number
    },

    // Tarifas de servicio
    rates: [ServiceRateSchema],

    // Tarifas de proyecto
    project_rates: [ProjectRateSchema],

    // Márgenes de utilidad
    profit_margins: {
        expenses: Number,
        logistics: Number,
        materials: Number,
        subcontracts: Number
    },

    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = model('LaborRate', LaborRateSchema);