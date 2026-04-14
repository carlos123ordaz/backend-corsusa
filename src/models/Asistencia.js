const { Schema, model } = require('mongoose');

// Schema para guardar el snapshot del período esperado
const expectedPeriodSchema = new Schema({
    start: String,
    end: String,
}, { _id: false });

// Schema para guardar el snapshot del horario del día
const expectedScheduleSchema = new Schema({
    day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    periods: [expectedPeriodSchema],
    isWorkday: Boolean,
    totalHours: Number,
}, { _id: false });

const AsistenciaSchema = Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    entrada: Date,
    salida: Date,
    marcado_por_entrada: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    marcado_por_salida: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    latitude_entrada: Number,
    longitude_entrada: Number,
    latitude_salida: Number,
    longitude_salida: Number,
    horas_trabajadas: Number,
    valido_entrada: Boolean,
    valido_salida: Boolean,
    sede: { type: Schema.Types.ObjectId, ref: 'Sede' },

    // Puntaje de similitud facial (para auditoría)
    similarity_entrada: { type: Number, default: null },
    similarity_salida: { type: Number, default: null },

    // ✅ NUEVO: Snapshot del horario esperado en el momento de la asistencia
    expectedSchedule: expectedScheduleSchema,

    // ✅ NUEVO: Información de cumplimiento calculada en el momento
    scheduleCompliance: {
        isLateEntry: { type: Boolean, default: false },
        minutesLateEntry: { type: Number, default: 0 },
        isEarlyDeparture: { type: Boolean, default: false },
        minutesEarlyDeparture: { type: Number, default: 0 },
        flexibleMinutesApplied: { type: Number, default: 30 },
        wasFlexible: { type: Boolean, default: true },
    },

    // ✅ NUEVO: Referencia al horario usado (opcional, para auditoría)
    scheduleConfigSnapshot: {
        scheduleConfigId: { type: Schema.Types.ObjectId, ref: 'ScheduleConfig' },
        configName: String,
        configColor: String,
        remoteDays: { type: [String], default: [] },
    },
}, {
    timestamps: true
})

module.exports = model('Asistencia', AsistenciaSchema)
