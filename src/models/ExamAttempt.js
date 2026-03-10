const { Schema, model } = require('mongoose');

const ExamAttemptSchema = new Schema({
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
    user_progress_id: {
        type: Schema.Types.ObjectId,
        ref: 'UserProgress',
        required: true
    },
    attempt_number: {
        type: Number,
        required: true // 1, 2, 3, etc.
    },
    // Respuestas del usuario
    answers: [{
        question_id: {
            type: Schema.Types.ObjectId,
            ref: 'Question',
            required: true
        },
        selected_options: [{
            type: Schema.Types.ObjectId // IDs de las opciones seleccionadas
        }],
        is_correct: {
            type: Boolean,
            required: true
        },
        points_earned: {
            type: Number,
            default: 0
        },
        answered_at: {
            type: Date,
            default: Date.now
        }
    }],
    // Resultados
    total_questions: {
        type: Number,
        required: true
    },
    correct_answers: {
        type: Number,
        required: true
    },
    total_points: {
        type: Number,
        required: true
    },
    points_earned: {
        type: Number,
        required: true
    },
    score_percentage: {
        type: Number, // Porcentaje (0-100)
        required: true
    },
    passing_score: {
        type: Number, // El passing_score configurado en el momento del examen
        required: true
    },
    passed: {
        type: Boolean,
        required: true
    },
    // Tiempos
    started_at: {
        type: Date,
        required: true
    },
    submitted_at: {
        type: Date,
        required: true
    },
    duration_seconds: {
        type: Number // Tiempo que tomó completar el examen
    }
}, {
    timestamps: true
});

// Índices
ExamAttemptSchema.index({ user_id: 1, course_id: 1, attempt_number: 1 });
ExamAttemptSchema.index({ user_progress_id: 1 });
ExamAttemptSchema.index({ course_id: 1, passed: 1 });

// Pre-save: calcular duración
ExamAttemptSchema.pre('save', function (next) {
    if (this.started_at && this.submitted_at) {
        this.duration_seconds = Math.round((this.submitted_at - this.started_at) / 1000);
    }
    next();
});

module.exports = model('ExamAttempt', ExamAttemptSchema);