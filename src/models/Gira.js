const { Schema, model } = require('mongoose');

const GiraSchema = Schema({
    task: String,
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    motivo: String,
    comentario: String,
    semana: String,
    unidad_negocio: String,
    task_gira: String,
    active: Boolean,
    estado: String,
    lugar: String,
    fecha_inicio: Date,
    fecha_fin: Date,
    monto_soles: Number,
    monto_dolares: Number
}, {
    timestamps: true
})

module.exports = model('Gira', GiraSchema)