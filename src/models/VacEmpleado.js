const { Schema, model } = require('mongoose');

const VacEmpleadoSchema = new Schema({
  name:       { type: String, required: true, trim: true },
  role:       { type: String, default: '' },
  area:       { type: String, required: true },
  leadId:     { type: Schema.Types.ObjectId, ref: 'VacEmpleado', default: null },
  avatar:     { type: String, default: 'var(--av-blue)' },
  ingreso:    { type: Date, required: true },
  saldoTotal: { type: Number, default: 30, min: 0 },
  tomados:    { type: Number, default: 0, min: 0 },
  pendientes: { type: Number, default: 0, min: 0 },
  userId:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
  active:     { type: Boolean, default: true },
}, { timestamps: true });

module.exports = model('VacEmpleado', VacEmpleadoSchema);
