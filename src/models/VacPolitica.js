const { Schema, model } = require('mongoose');

const tipoHabilitadoSchema = new Schema(
  { id: String, enabled: { type: Boolean, default: true } },
  { _id: false }
);

const VacPoliticaSchema = new Schema({
  diasBase:         { type: Number, default: 30, min: 1 },
  periodo:          { type: String, enum: ['aniversario','calendario','fiscal'], default: 'aniversario' },
  anticipacion:     { type: Number, default: 15, min: 0 },
  maxBloque:        { type: Number, default: 15, min: 1 },
  adelantar:        { type: Boolean, default: true },
  doblePaso:        { type: Boolean, default: true },
  autoAprobar:      { type: Boolean, default: false },
  notifEmail:       { type: Boolean, default: true },
  notifSlack:       { type: Boolean, default: true },
  tiposHabilitados: { type: [tipoHabilitadoSchema], default: [] },
}, { timestamps: true });

module.exports = model('VacPolitica', VacPoliticaSchema);
