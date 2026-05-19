const mongoose = require('mongoose');

const caseLabelSchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    areaId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Area', required: true },
    startDate:  { type: Date, required: true },
    endDate:    { type: Date, required: true },
    month:      { type: Number, required: true },
    year:       { type: Number, required: true },
    caseNumber: { type: String, required: true, trim: true },
}, { timestamps: true });

caseLabelSchema.index({ areaId: 1, userId: 1, month: 1, year: 1 });
caseLabelSchema.index({ caseNumber: 1 });

module.exports = mongoose.model('CaseLabel', caseLabelSchema);
