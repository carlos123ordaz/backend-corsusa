// models/Staff.js
const { Schema, model } = require('mongoose');

const StaffSchema = Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    full_name: {
        type: String,
        required: true
    },
    phone: String,
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    position: String,

    // Roles disponibles en cotizaciones
    roles: [{
        type: String,
        enum: ['Preparado', 'Responsable', 'V.B.', 'Manager']
    }],

    department: {
        type: String,
        enum: ['UN AU', 'UN AI', 'UN VA', 'Servicios', 'Proyectos', 'HSEQ', 'Otros']
    },

    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = model('Staff', StaffSchema);