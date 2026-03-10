const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    codigo_comercial: {
        type: String,
        required: true,
        index: true
    },

    almacen: {
        type: String,
        required: true,
        index: true
    },

    stock_actual: {
        type: Number,
        required: true,
        default: 0
    },

    unidad_medida: String
});


module.exports = mongoose.model('Inventory', InventorySchema);