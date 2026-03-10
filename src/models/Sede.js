const { Schema, model } = require('mongoose');

const SedeSchema = Schema({
    nombre: String,
    direccion: String,
    latitude: Number,
    longitude: Number,
    radio: Number,
    active: { type: Boolean, default: true }
}, {
    timestamps: true
})

module.exports = model('Sede', SedeSchema)