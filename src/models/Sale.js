// models/Venta.js
const mongoose = require('mongoose');

const VentaSchema = new mongoose.Schema(
    {
        correlativo_opci: {
            type: String,
            required: true,
            index: true,
            unique: true
        },

        numero_op: {
            type: String,
            required: true,
            index: true
        },

        cliente_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BusinessPartner',
            required: true
        },
        numero_referencia_cliente: {
            type: String
        },

        cliente_final: {
            type: String
        },

        cliente_proveedor: {
            type: String
        },

        moneda: {
            type: String,
            enum: ['PEN', 'USD'],
            required: true
        },

        monto_total_sin_igv: {
            type: Number,
            required: true
        },

        forma_pago: {
            type: String
        },

        fechas: {
            fecha_recepcion: Date,
            fecha_inicio: Date,
            fecha_procesamiento_vi: Date
        },

        vendedores: {
            vendedor1: String,
            vendedor2: String,
            lider: String
        },

        u_bruta_cotizacion: {
            type: Number
        },

        comision_compartida: {
            type: Boolean,
            default: false
        },

        estado: {
            type: String,
            enum: ['borrador', 'aprobada', 'parcial', 'cerrada', 'anulada'],
            default: 'borrador',
            index: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Sale', VentaSchema);
