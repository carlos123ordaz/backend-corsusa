// models/Purchase.js
const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema(
    {
        tipo_compra: {
            type: String,
            enum: ['importacion', 'local'],
            required: true,
            index: true
        },

        correlativo_opci: {
            type: String,
            index: true
        },

        numero_oc: {
            type: String,
            required: true,
            index: true
        },

        proveedor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BusinessPartner',
            required: true
        },

        categoria_forma_pago: {
            type: String
        },

        forma_pago: {
            type: String
        },

        estado: {
            type: String,
            enum: ['borrador', 'emitida', 'confirmada', 'parcial', 'cerrada', 'anulada'],
            default: 'borrador',
            index: true
        },

        fechas: {
            fecha_oc: Date,
            fecha_inicio: Date
        },

        notas: []
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Purchase', PurchaseSchema);
