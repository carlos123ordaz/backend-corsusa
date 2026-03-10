// models/Client.js
const { Schema, model } = require('mongoose');

const ContactSchema = Schema({
    name: String,
    position: String,
    email: String,
    phone: String
}, { _id: false });

const AddressSchema = Schema({
    type: {
        type: String,
        enum: ['main', 'billing', 'delivery', 'other']
    },
    address: String,
    city: String,
    department: String,
    country: {
        type: String,
        default: 'PE'
    }
}, { _id: false });

const ClientSchema = Schema({
    name: {
        type: String,
        required: true
    },
    ruc: {
        type: String,
        unique: true,
        sparse: true
    },
    client_type: {
        type: String,
        required: true,
        enum: ['01 Cliente Final', '02 Pyme', '03 Partner', '04 Canal', '05 Competencia']
    },
    industry: String,

    contacts: [ContactSchema],
    addresses: [AddressSchema],

    // Condiciones por defecto
    default_conditions: {
        payment_terms: String,
        delivery_place: String,
        discount_type: String
    },

    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = model('Client', ClientSchema);