const { Schema, model } = require('mongoose');

const VacFeriadoSchema = new Schema({
  iso:    { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  nombre: { type: String, required: true, trim: true },
  year:   { type: Number, required: true },
}, { versionKey: false });

module.exports = model('VacFeriado', VacFeriadoSchema);
