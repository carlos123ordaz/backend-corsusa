const mongoose = require('mongoose');

const scheduleOrderSchema = new mongoose.Schema({
    viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    areaId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Area',  required: true },
    order:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

scheduleOrderSchema.index({ viewerId: 1, areaId: 1 }, { unique: true });

module.exports = mongoose.model('ScheduleOrder', scheduleOrderSchema);
