// models/PricingFactor.js
const { Schema, model } = require('mongoose');

const PricingFactorSchema = Schema({
  spk_code: {
    type: String,
    required: true,
    unique: true
  },
  spk_label: String,
  department: {
    type: String,
    enum: ['UN AU', 'UN AI', 'UN VA', 'Servicios', 'Proyectos', 'HSEQ', 'Otros']
  },

  brand_code: String,
  brand_name: String,
  family_code: String,
  family_name: String,
  resumen_category: String,

  // Factores de cálculo
  discount_factor: {
    type: Number,
    default: 1
  },

  import_factors: {
    consolidated: Number,
    dhl: Number,
    needs_consultation: {
      type: Boolean,
      default: false
    }
  },

  margin_factors: {
    consolidated: Number,
    dhl: Number
  },

  max_discount: {
    type: Number,
    default: 0
  },

  commission: {
    type: Number,
    default: 0
  },

  threshold: Number,

  effective_date: Date,

  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = model('PricingFactor', PricingFactorSchema);