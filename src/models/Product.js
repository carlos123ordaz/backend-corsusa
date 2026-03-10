const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema(
    {
        codigo_comercial: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        model: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        material: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        uso: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        description: {
            type: String
        },

        brand: {
            type: String
        },

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

module.exports = mongoose.model('Product', ProductSchema);
