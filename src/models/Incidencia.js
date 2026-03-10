const mongoose = require('mongoose');

const incidenciaSchema = new mongoose.Schema({
    fecha: {
        type: Date,
        required: true
    },
    ubicacion: {
        type: String,
        required: true
    },
    areaAfectada: {
        type: String,
        required: true
    },
    tipoIncidente: {
        type: String,
        required: true
    },
    gradoSeveridad: {
        type: String,
        required: true,
        enum: ['Bajo', 'Medio', 'Alto', 'Crítico']
    },
    descripcion: {
        type: String,
        required: true
    },
    recomendacion: {
        type: String,
        default: ''
    },
    imagenes: [{
        type: String,
        default: null
    }],
    imagenesAnotadas: [{
        original: String,
        anotada: String,
        fechaAnotacion: Date
    }],
    imagenesResolucion: [{
        type: String,
        default: null
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deadline: {
        type: Date,
        default: null
    },
    historialDeadline: [{
        deadlineAnterior: Date,
        deadlineNuevo: Date,
        fecha: {
            type: Date,
            default: Date.now
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notas: String
    }],
    asigned: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    estado: {
        type: String,
        enum: ['Pendiente', 'En Revisión', 'Resuelto', 'Cerrado'],
        default: 'Pendiente'
    },
    historialEstados: [{
        estado: {
            type: String,
            enum: ['Pendiente', 'En Revisión', 'Resuelto', 'Cerrado']
        },
        fecha: {
            type: Date,
            default: Date.now
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notas: String
    }]
}, {
    timestamps: true
});

// Vamos a escribir codigo sin saber nada de nada de lo que estamos hacien
incidenciaSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.estado || update.$set?.estado) {
        const nuevoEstado = update.estado || update.$set.estado;
        if (!update.$push) {
            update.$push = {};
        }
        update.$push.historialEstados = {
            estado: nuevoEstado,
            fecha: new Date(),
            usuario: update.user,
            notas: update.notasEstado || ''
        };
    }
    if (update.deadlineNuevo !== undefined) {
        if (!update.$push) {
            update.$push = {};
        }
        update.$push.historialDeadline = {
            deadlineAnterior: update.deadlineAnterior,
            deadlineNuevo: update.deadlineNuevo,
            fecha: new Date(),
            user: update.user,
            notas: update.notasDeadline || ''
        };
        if (!update.$set) {
            update.$set = {};
        }
        update.$set.deadline = update.deadlineNuevo;
        delete update.deadlineNuevo;
        delete update.deadlineAnterior;
        delete update.notasDeadline;
    }

    next();
});

module.exports = mongoose.model('Incidence', incidenciaSchema);