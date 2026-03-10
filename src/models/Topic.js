const { Schema, model } = require('mongoose');

const TopicSchema = new Schema({
    course_id: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    order: {
        type: Number,
        required: true // Orden del tema dentro del curso
    },
    // Video de Bunny.net
    video: {
        bunny_video_id: {
            type: String, // ID del video en Bunny.net
            required: true
        },
        bunny_library_id: {
            type: String, // ID de la biblioteca en Bunny.net
            required: true
        },
        duration_seconds: {
            type: Number // Duración del video en segundos
        },
        thumbnail_url: {
            type: String // URL del thumbnail del video
        }
    },
    // Materiales adicionales (PDFs, documentos, etc.) en Google Cloud Storage
    materials: [{
        title: {
            type: String,
            required: true
        },
        file_type: {
            type: String, // pdf, docx, xlsx, pptx, etc.
            required: true
        },
        file_url: {
            type: String, // URL del archivo en Google Cloud Storage
            required: true
        },
        file_size_bytes: {
            type: Number
        },
        uploaded_at: {
            type: Date,
            default: Date.now
        }
    }],
    // Configuración de duración estimada
    estimated_duration_minutes: {
        type: Number // Duración estimada en minutos (video + lectura de materiales)
    },
    // Estado
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índices
TopicSchema.index({ course_id: 1, order: 1 });
TopicSchema.index({ course_id: 1, is_active: 1 });

module.exports = model('Topic', TopicSchema);