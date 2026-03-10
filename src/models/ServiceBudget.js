// models/ServiceBudget.js
const { Schema, model } = require('mongoose');

const ExpenseItemSchema = Schema({
    code: String,
    name: String,
    currency: {
        type: String,
        enum: ['US$', 'S/.']
    },
    unit_amount: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    cost_pen: { type: Number, default: 0 },
    cost_usd: { type: Number, default: 0 },
    sale_pen: { type: Number, default: 0 },
    sale_usd: { type: Number, default: 0 }
}, { _id: false });

const LaborItemSchema = Schema({
    rate_usd: Number,
    hours: { type: Number, default: 0 },
    days: { type: Number, default: 0 },
    sale_usd: { type: Number, default: 0 }
}, { _id: false });

const ServiceBudgetSchema = Schema({
    quotation_id: {
        type: Schema.Types.ObjectId,
        ref: 'Quotation',
        required: true
    },

    annex_number: {
        type: Number,
        required: true
    },

    version: String,

    // Configuración
    location: {
        type: String,
        enum: ['01 Lima', '02 Provincia', '03 Extranjero']
    },
    city: String,
    service_type: {
        type: String,
        enum: ['01 Normal', '02 Intermedio', '03 Especial']
    },
    service_detail: String,
    prepared_by: String,
    exchange_rate: Number,

    // === EGRESOS ===
    expenses: {
        logistics: {
            travel: [ExpenseItemSchema],
            mobility: [ExpenseItemSchema],
            lodging: [ExpenseItemSchema],
            per_diem: [ExpenseItemSchema]
        },
        subcontracts: [ExpenseItemSchema],
        materials: [ExpenseItemSchema],
        extras: {
            administrative: {
                cost_usd: Number,
                sale_usd: Number
            },
            operational: {
                cost_usd: Number,
                sale_usd: Number
            },
            other: {
                cost_usd: Number,
                sale_usd: Number
            }
        }
    },

    // === INGRESOS (Mano de obra) ===
    labor: {
        calibration: LaborItemSchema,
        normal_weekday: LaborItemSchema,
        normal_saturday: LaborItemSchema,
        normal_sunday: LaborItemSchema,
        intermediate_weekday: LaborItemSchema,
        intermediate_saturday: LaborItemSchema,
        intermediate_sunday: LaborItemSchema,
        specialized_weekday: LaborItemSchema,
        specialized_saturday: LaborItemSchema,
        specialized_sunday: LaborItemSchema,
        transit: LaborItemSchema,
        medical_exam: LaborItemSchema,
        induction: LaborItemSchema,
        report: LaborItemSchema,
        other: LaborItemSchema
    },

    // === RESUMEN ===
    summary: {
        total_income_usd: { type: Number, default: 0 },
        total_expense_usd: { type: Number, default: 0 },
        discount_percentage: { type: Number, default: 0 },
        final_sale_price_usd: { type: Number, default: 0 },
        profit_usd: { type: Number, default: 0 },
        profit_percentage: { type: Number, default: 0 },
        total_instruments: { type: Number, default: 0 },
        service_days: { type: Number, default: 0 },
        total_hours: { type: Number, default: 0 }
    },

    // Precios adicionales por día
    additional_day_rates: {
        weekday: Number,
        saturday: Number,
        sunday_holiday: Number
    },

    // === ANÁLISIS REAL POST-SERVICIO ===
    actual_analysis: {
        completed: {
            type: Boolean,
            default: false
        },
        expenses: Schema.Types.Mixed,
        labor: Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Índices
ServiceBudgetSchema.index({ quotation_id: 1, annex_number: 1 }, { unique: true });

module.exports = model('ServiceBudget', ServiceBudgetSchema);