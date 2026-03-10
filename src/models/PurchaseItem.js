const mongoose = require('mongoose');

const PurchaseItemSchema = new mongoose.Schema(
    {
        purchase_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Purchase',
            required: true,
            index: true
        },

        item_venta_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SaleItem',
            required: true,
            index: true
        },

        item_oc: {
            type: Number,
            required: true
        },

        item_op: {
            type: Number
        },

        codigo_comercial: {
            type: String,
            required: true,
            index: true
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

        pcu1: Number,
        pcu2: Number,

        tipo_cambio_usd: Number,

        tiempo_entrega_semanas: Number,

        cotizacion_proveedor: {
            numero: String,
            fecha_ofrecida: Date
        },

        confirmacion_proveedor: {
            numero: String
        },

        fechas_proveedor: {
            inicial: Date,
            act1: Date,
            act2: Date,
            act3: Date,
            act4: Date
        },
        importacion: {
            operador_logistico: String,
            grupo_importacion: String,
            incoterm: String,
            tipo_embarque: String,
            pais_embarque: String,
            ciudad_embarque: String,
            pais_origen: String,
            fecha_invoice: Date,
            numero_invoice: String,
            numero_item_invoice: String,
            numero_doc_transporte: String,
            eta: Date,
            peso_bruto_kgs: Number,
            flete_usd: Number
        },

        local: {
            fecha_factura: Date,
            numero_factura: String,
            numero_item_factura: String
        },

        estado: {
            type: String,
            enum: ['pendiente', 'ordenado', 'confirmado', 'recibido', 'anulado'],
            default: 'pendiente',
            index: true
        },

        notas: []
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('PurchaseItem', PurchaseItemSchema);
