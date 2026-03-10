const { Schema, model } = require('mongoose');

const UserProgressSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course_id: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    // Fecha de asignación y límite
    assigned_at: {
        type: Date,
        default: Date.now
    },
    deadline: {
        type: Date,
        required: true // Se calcula automáticamente: assigned_at + course.deadline_days
    },
    // Estado general del curso
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'overdue'],
        default: 'not_started'
    },
    // Progreso por tema
    topics_progress: [{
        topic_id: {
            type: Schema.Types.ObjectId,
            ref: 'Topic',
            required: true
        },
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'completed'],
            default: 'not_started'
        },
        // Último segundo visto del video
        last_video_position_seconds: {
            type: Number,
            default: 0
        },
        // Respuestas a preguntas intermedias
        intermediate_questions_answered: [{
            question_id: {
                type: Schema.Types.ObjectId,
                ref: 'Question'
            },
            answered_at: {
                type: Date,
                default: Date.now
            },
            selected_options: [{
                type: Schema.Types.ObjectId // IDs de las opciones seleccionadas
            }],
            is_correct: {
                type: Boolean
            },
            attempts: {
                type: Number,
                default: 1
            }
        }],
        // Marca como completado cuando termina el video y responde todas las preguntas
        completed_at: {
            type: Date
        },
        started_at: {
            type: Date
        }
    }],
    // Examen final
    exam_status: {
        type: String,
        enum: ['not_attempted', 'in_progress', 'passed', 'failed'],
        default: 'not_attempted'
    },
    exam_attempts: {
        type: Number,
        default: 0
    },
    best_exam_score: {
        type: Number,
        default: 0 // Porcentaje (0-100)
    },
    // Progreso general
    overall_progress_percentage: {
        type: Number,
        default: 0 // Porcentaje de temas completados
    },
    // Fecha de finalización
    completed_at: {
        type: Date
    },
    // Fechas importantes
    started_at: {
        type: Date
    },
    last_accessed_at: {
        type: Date
    }
}, {
    timestamps: true
});

// Índices
UserProgressSchema.index({ user_id: 1, course_id: 1 }, { unique: true });
UserProgressSchema.index({ user_id: 1, status: 1 });
UserProgressSchema.index({ course_id: 1, status: 1 });
UserProgressSchema.index({ deadline: 1, status: 1 });

// Método para actualizar el progreso general
UserProgressSchema.methods.updateOverallProgress = function () {
    if (this.topics_progress.length === 0) {
        this.overall_progress_percentage = 0;
        return;
    }

    const completedTopics = this.topics_progress.filter(tp => tp.status === 'completed').length;
    this.overall_progress_percentage = Math.round((completedTopics / this.topics_progress.length) * 100);

    // Actualizar estado
    if (this.overall_progress_percentage === 100 && this.exam_status === 'passed') {
        this.status = 'completed';
        if (!this.completed_at) {
            this.completed_at = new Date();
        }
    } else if (this.overall_progress_percentage > 0) {
        this.status = 'in_progress';
    }

    // Verificar si está vencido
    if (new Date() > this.deadline && this.status !== 'completed') {
        this.status = 'overdue';
    }
};

module.exports = model('UserProgress', UserProgressSchema);