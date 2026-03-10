// models/Brand.js
const { Schema, model } = require('mongoose');

const ProductFamilySchema = Schema({
    code: String,
    name: String,
    spk_codes: [String]
}, { _id: false });

const BrandSchema = Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    full_name: String,

    department: {
        type: String,
        enum: ['UN AU', 'UN AI', 'UN VA', 'Servicios', 'Proyectos', 'HSEQ', 'Otros']
    },

    category_code: String,

    product_families: [ProductFamilySchema],

    origin_country: String,

    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = model('Brand', BrandSchema);