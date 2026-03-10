// models/UnitOfMeasure.js
const mongoose = require('mongoose');

const UnitOfMeasureSchema = new mongoose.Schema(
    {
        codigo: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        descripcion: {
            type: String
        },

        tipo: {
            type: String,
            enum: ['unidad', 'peso', 'volumen', 'longitud']
        },

        factor_base: {
            type: Number,
            default: 1
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('UnitOfMeasure', UnitOfMeasureSchema);
