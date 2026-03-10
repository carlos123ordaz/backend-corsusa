const mongoose = require('mongoose');

const SalesInvoiceSchema = new mongoose.Schema(
    {
        correlativo_opci: {
            type: String,
            index: true
        },

        venta_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sale',
            required: true,
            index: true
        },

        status_factura: {
            type: String,
            enum: ['borrador', 'emitida', 'parcialmente_pagada', 'pagada', 'anulada'],
            default: 'borrador',
            index: true
        },

        numero_factura: {
            type: String,
            required: true,
            index: true,
            unique: true
        },

        fechas: {
            fecha_emision: {
                type: Date,
                required: true
            },
            fecha_inicio: Date,
            fecha_prometida_pago: Date,
            fecha_pago: Date
        },

        condiciones_pago: {
            categoria_forma_pago: String,
            forma_pago: String,
            dias_cobranza: Number
        },

        moneda: {
            type: String,
            enum: ['PEN', 'USD'],
            required: true
        },

        montos: {
            monto_total_sin_igv: {
                type: Number,
                required: true
            },
            factor_igv: {
                type: Number,
                default: 0.18
            },
            monto_igv: {
                type: Number
            },
            monto_total_con_igv: {
                type: Number
            }
        },

        tipo_cambio: {
            tc_usd_sol: Number
        },

        producto_crm: {
            type: String
        },

        entidad_financiera: {
            type: String
        },

        categoria_operacion: {
            type: String
        },

        notas: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

SalesInvoiceSchema.pre('save', function (next) {
    this.montos.monto_igv =
        this.montos.monto_total_sin_igv * this.montos.factor_igv;

    this.montos.monto_total_con_igv =
        this.montos.monto_total_sin_igv + this.montos.monto_igv;

    next();
});

module.exports = mongoose.model('SalesInvoice', SalesInvoiceSchema);
