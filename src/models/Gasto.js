const { Schema, model } = require('mongoose');

const GastoSchema = Schema({
    tipo: String,
    categoria: String,
    ruc: String,
    razon_social: String,
    fecha_emision: Date,
    total: Number,
    moneda: String,
    igv: Number,
    descuento: Number,
    detraccion: Number,
    modificado: Boolean,
    img_url: String,
    con_sustento: Boolean,
    detalle_sustento: String,
    descripcion: String,
    direccion: String,
    costCenter_1: { type: Schema.Types.ObjectId, ref: 'CostCenter' },
    costCenter_2: { type: Schema.Types.ObjectId, ref: 'CostCenter' },
    costCenter_3: { type: Schema.Types.ObjectId, ref: 'CostCenter' },
    items: [
        {
            descripcion: String,
            precio_unitario: Number,
            cantidad: Number,
            subtotal: Number
        }
    ],
    taskId: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    revisado: {
        type: Boolean,
        default: false
    },
    revisado_por: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    fecha_revision: {
        type: Date,
        default: null
    },
    comentario_revision: {
        type: String,
        default: null
    }

}, {
    timestamps: true
})

module.exports = model('Gasto', GastoSchema)