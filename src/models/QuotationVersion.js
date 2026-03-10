// models/QuotationVersion.js
const { Schema, model } = require('mongoose');

const QuotationVersionSchema = Schema({
    quotation_id: {
        type: Schema.Types.ObjectId,
        ref: 'Quotation',
        required: true
    },

    revision: {
        type: String,
        required: true
    },

    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'Staff'
    },

    // Snapshot completo de la cotización
    snapshot: {
        type: Schema.Types.Mixed,
        required: true
    },

    // PDF generado
    pdf_url: String,

    changes_summary: String,

    is_final: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Índices
QuotationVersionSchema.index({ quotation_id: 1, revision: 1 }, { unique: true });
QuotationVersionSchema.index({ created_at: -1 });

module.exports = model('QuotationVersion', QuotationVersionSchema);