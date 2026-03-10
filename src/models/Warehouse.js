const mongoose = require('mongoose');

const WarehouseSchema = new mongoose.Schema(
    {
        codigo: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        nombre: {
            type: String,
            required: true
        },

        direccion: {
            type: String
        },

        ciudad: String,
        pais: String,

        estado: {
            type: String,
            enum: ['activo', 'inactivo'],
            default: 'activo'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Warehouse', WarehouseSchema);
