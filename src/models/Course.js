const { Schema, model } = require('mongoose');

const CourseSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String, // URL de la imagen del curso
    },
    // Configuración de duración y fechas
    estimated_duration_hours: {
        type: Number, // Duración estimada en horas
    },
    deadline_days: {
        type: Number, // Días para completar desde la asignación
        required: true,
        default: 30
    },
    // Áreas a las que se asigna este curso (obligatorio para estas áreas)
    assigned_areas: [{
        type: Schema.Types.ObjectId,
        ref: 'Area'
    }],
    // Usuarios específicos asignados (opcional, además de las áreas)
    assigned_users: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Configuración del examen final
    exam_config: {
        enabled: {
            type: Boolean,
            default: true
        },
        passing_score: {
            type: Number,
            default: 70, // Porcentaje mínimo para aprobar
            min: 0,
            max: 100
        },
        allow_retake: {
            type: Boolean,
            default: true // Permitir reintentar el examen
        },
        max_attempts: {
            type: Number,
            default: 3, // Número máximo de intentos si allow_retake es true
        },
        shuffle_questions: {
            type: Boolean,
            default: true // Mezclar preguntas en cada intento
        }
    },
    // Estado del curso
    is_active: {
        type: Boolean,
        default: true
    },
    // Estadísticas
    total_topics: {
        type: Number,
        default: 0
    },
    total_enrolled: {
        type: Number,
        default: 0
    },
    total_completed: {
        type: Number,
        default: 0
    },
    // Creador del curso
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Índices para búsquedas
CourseSchema.index({ title: 'text', description: 'text' });
CourseSchema.index({ assigned_areas: 1 });
CourseSchema.index({ is_active: 1 });

module.exports = model('Course', CourseSchema);