const { Schema, model } = require('mongoose');

const RoleSchema = Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    permissions: [{
        type: String,
    }],
    active: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true
});

module.exports = model('Role', RoleSchema);
