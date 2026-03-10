const { Schema, model } = require('mongoose');

const UserSchema = Schema({
    photo: String,
    name: String,
    lname: String,
    dni: String,
    position: String,
    areas: [{
        type: Schema.Types.ObjectId,
        ref: 'Area'
    }],
    phone: String,
    email: String,
    password: String,
    sede: { type: Schema.Types.ObjectId, ref: 'Sede' },
    pushToken: {
        type: String,
        default: null
    },
    pushTokens: [{
        token: String,
        device: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    active: { type: Boolean, default: true }
}, {
    timestamps: true
})

module.exports = model('User', UserSchema)