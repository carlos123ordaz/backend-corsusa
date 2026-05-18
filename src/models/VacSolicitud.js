const { Schema, model } = require('mongoose');

const VacSolicitudSchema = new Schema({
  empId:         { type: Schema.Types.ObjectId, ref: 'VacEmpleado', required: true },
  tipo:          { type: String, required: true, enum: ['vacaciones', 'permiso-goce', 'permiso-singoce', 'medica', 'cumple'] },
  desde:         { type: String, required: true },  // YYYY-MM-DD
  hasta:         { type: String, required: true },  // YYYY-MM-DD
  dias:          { type: Number, required: true, min: 0.5 },
  medioDia:      { type: Boolean, default: false },
  estado:        { type: String, enum: ['pendiente', 'aprobado', 'rechazado'], default: 'pendiente' },
  motivo:        { type: String, required: true },
  solicitada:    { type: Date, default: Date.now },
  aprobadorId:   { type: Schema.Types.ObjectId, ref: 'VacEmpleado', default: null },
  responsableId: { type: Schema.Types.ObjectId, ref: 'VacEmpleado', default: null },
  nivel:         { type: String, enum: ['lider', 'rrhh'], default: 'lider' },
  aprobada:      { type: Date, default: null },
  motivoRechazo: { type: String, default: null },
}, { timestamps: true });

module.exports = model('VacSolicitud', VacSolicitudSchema);
