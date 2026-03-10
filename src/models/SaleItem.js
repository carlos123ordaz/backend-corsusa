// models/ItemVenta.js
const mongoose = require('mongoose');

const ItemVentaSchema = new mongoose.Schema(
    {
        venta_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sale',
            required: true,
            index: true
        },

        item_op: {
            type: Number,
            required: true
        },

        status_op: {
            type: String
        },

        tipo_negocio: {
            type: String
        },

        sub_tipo_negocio_1: {
            type: String
        },

        sub_tipo_negocio_2: {
            type: String
        },

        codigo_comercial: {
            type: String,
            required: true,
            index: true
        },

        descripcion: {
            type: String
        },

        cantidad: {
            type: Number,
            required: true
        },

        unidad_medida: {
            type: String
        },

        moneda: {
            type: String,
            enum: ['PEN', 'USD'],
            required: true
        },

        pvu: {
            type: Number,
            required: true
        },

        tipo_cambio_usd: {
            type: Number
        },

        fecha_requerida_cliente: {
            type: Date
        },

        tiempo_entrega_semanas: {
            type: Number
        },

        numero_cotizacion: {
            type: String
        },

        requiere_armado: {
            type: Boolean,
            default: false
        },

        codigo_cliente: {
            type: String
        },

        numero_deal: {
            type: String
        },

        numero_servicio: {
            type: String
        },

        numero_proyecto: {
            type: String
        },

        centros_costo: {
            cc: String,
            scc: String,
            sscc: String
        },

        notas: [],
        estado: {
            type: String,
            enum: ['pendiente', 'en_compra', 'comprado', 'entregado', 'anulado'],
            default: 'pendiente',
            index: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('SaleItem', ItemVentaSchema);
