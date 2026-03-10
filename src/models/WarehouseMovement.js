const mongoose = require('mongoose');

const WarehouseMovementSchema = new mongoose.Schema(
    {
        correlativo_opci: {
            type: String,
            index: true
        },

        purchase_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Purchase',
            index: true
        },

        purchase_item_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PurchaseItem',
            required: true,
            index: true
        },

        item_op: Number,
        item_oc: Number,

        codigo_comercial: {
            type: String,
            index: true
        },

        almacen: {
            type: String,
            required: true
        },

        grupo_importacion: {
            type: String
        },


        status_almacen_1: {
            type: String,
            enum: ['pendiente', 'recibido', 'revisado', 'despachado']
        },

        status_almacen_2: {
            type: String
        },


        confirmaciones: {
            conf_almacen: Boolean,
            motivo_conf_almacen: String,
            conf_servicio: Boolean,
            motivo_conf_servicio: String
        },


        cantidad: {
            type: Number,
            required: true
        },

        unidad_medida: String,


        fechas: {
            fecha_recepcion: Date,
            fecha_mercaderia_revisada: Date,
            fecha_despacho: Date
        },

        despacho: {
            distrito: String,
            guia_remision: String
        },

        erp: {
            inta_entrada: String,
            inta_salida: String
        },
        notas: {
            nota1: String,
            nota2: String,
            nota3: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('WarehouseMovement', WarehouseMovementSchema);
