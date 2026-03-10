// models/Config.js
const { Schema, model } = require('mongoose');

const ConfigSchema = Schema({
    type: {
        type: String,
        required: true,
        enum: ['dropdown_options', 'global_settings'],
        default: 'dropdown_options'
    },

    // Opciones de compra/moneda
    purchase_currencies: [String],

    // Tipos de oferta
    offer_types: [String],

    // Tipos de cliente
    client_types: [{
        code: String,
        label: String,
        discount: Number
    }],

    // Categorías de oferta
    offer_categories: [String],

    // Formas de pago
    payment_terms: [String],

    // Tiempos de entrega
    delivery_times: [String],

    // Lugares de entrega
    delivery_places: [String],

    // Validación de items
    item_validations: [String],

    // Estatus del item
    item_statuses: [String],

    // Estados de cotización
    quotation_statuses: [String],

    // Departamentos
    departments: [String],

    // Factores globales de importación
    global_import_factors: {
        air_freight_dhl: Number,
        air_freight_consolidated: Number,
        customs_agent_dhl: Number,
        customs_agent_consolidated: Number,
        customs_dhl: Number,
        customs_consolidated: Number,
        margin_dhl: Number,
        margin_consolidated: Number,
        margin_resale: Number,
        eur_to_usd: Number,
        usd_to_pen: Number
    },

    // Dimensiones de embarque
    shipping_dimensions: {
        commercial_flight_max: String,
        commercial_flight_recommended: String,
        cargo_flight_max: String,
        cargo_flight_recommended: String
    }
}, {
    timestamps: true
});

module.exports = model('Config', ConfigSchema);