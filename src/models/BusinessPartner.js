// models/BusinessPartner.js
const mongoose = require('mongoose');

const BusinessPartnerSchema = new mongoose.Schema(
    {
        razon_social: {
            type: String,
            required: true,
            index: true
        },

        ruc: {
            type: String,
            index: true,
            unique: true
        },

        roles: {
            type: [String],
            enum: ['cliente', 'proveedor'],
            required: true,
            index: true
        },

        estado: {
            type: String,
            enum: ['activo', 'inactivo'],
            default: 'activo'
        },

        contacto: {
            nombre: String,
            email: String,
            telefono: String
        },

        direcciones: [
            {
                tipo: { type: String, enum: ['fiscal', 'entrega'] },
                direccion: String,
                ciudad: String,
                pais: String
            }
        ],

        condiciones_pago: {
            categoria: String,
            forma_pago: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('BusinessPartner', BusinessPartnerSchema);
