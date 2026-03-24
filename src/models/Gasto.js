const { Schema, model } = require('mongoose');

const CostCenterAllocationSchema = new Schema({
    costCenter_1: { type: Schema.Types.ObjectId, ref: 'CostCenter', required: true },
    costCenter_2: { type: Schema.Types.ObjectId, ref: 'CostCenter', default: null },
    costCenter_3: { type: Schema.Types.ObjectId, ref: 'CostCenter', default: null },
    percentage: { type: Number, required: true, min: 1, max: 100 }
}, { _id: false });

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
    costCenterAllocations: {
        type: [CostCenterAllocationSchema],
        validate: {
            validator: function (allocations) {
                if (!allocations || allocations.length === 0) return true;
                const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
                return totalPercentage === 100;
            },
            message: 'La suma de porcentajes debe ser exactamente 100%'
        }
    },

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
});

module.exports = model('Gasto', GastoSchema);