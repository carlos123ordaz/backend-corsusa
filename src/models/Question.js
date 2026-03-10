const { Schema, model } = require('mongoose');

const QuestionSchema = new Schema({
    course_id: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    topic_id: {
        type: Schema.Types.ObjectId,
        ref: 'Topic',
        default: null // null si es pregunta de examen final
    },
    question_type: {
        type: String,
        enum: ['intermediate', 'final_exam'], // Pregunta intermedia o de examen final
        required: true
    },
    question_text: {
        type: String,
        required: true
    },
    // Configuración de respuestas
    options: [{
        text: {
            type: String,
            required: true
        },
        is_correct: {
            type: Boolean,
            required: true,
            default: false
        }
    }],
    // Si es multi-respuesta
    is_multiple_choice: {
        type: Boolean,
        default: false // false = una sola respuesta, true = puede seleccionar múltiples
    },
    // Para preguntas intermedias: momento en el video donde aparece
    video_timestamp_seconds: {
        type: Number, // Segundo del video donde debe pausarse y mostrar la pregunta
        default: null // Solo aplica para preguntas intermedias
    },
    // Explicación opcional (se muestra después de responder)
    explanation: {
        type: String
    },
    // Orden (para examen final)
    order: {
        type: Number
    },
    // Puntos (para calcular el score del examen)
    points: {
        type: Number,
        default: 1
    },
    // Estado
    is_active: {
        type: Boolean,
        default: true
    },
    // Creador
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Índices
QuestionSchema.index({ course_id: 1, question_type: 1 });
QuestionSchema.index({ topic_id: 1, video_timestamp_seconds: 1 });

// Validación: preguntas intermedias deben tener topic_id y video_timestamp
QuestionSchema.pre('save', function (next) {
    if (this.question_type === 'intermediate') {
        if (!this.topic_id) {
            return next(new Error('Las preguntas intermedias deben tener un topic_id'));
        }
        if (this.video_timestamp_seconds === null) {
            return next(new Error('Las preguntas intermedias deben tener un video_timestamp_seconds'));
        }
    }

    // Validar que al menos una opción sea correcta
    const correctOptions = this.options.filter(opt => opt.is_correct);
    if (correctOptions.length === 0) {
        return next(new Error('Debe haber al menos una opción correcta'));
    }

    // Si no es multi-respuesta, solo puede haber una opción correcta
    if (!this.is_multiple_choice && correctOptions.length > 1) {
        return next(new Error('Las preguntas de una sola respuesta solo pueden tener una opción correcta'));
    }

    next();
});

module.exports = model('Question', QuestionSchema);