const CaseLabel = require('../models/CaseLabel');

const dateKey = (d) => {
    const date = new Date(d);
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
};

exports.getByMonth = async (req, res) => {
    try {
        const { month, year, areaId } = req.params;
        const m = parseInt(month), y = parseInt(year);
        const firstDay = new Date(Date.UTC(y, m, 1));
        const lastDay  = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
        const labels = await CaseLabel.find({
            areaId,
            startDate: { $lte: lastDay },
            endDate:   { $gte: firstDay },
        }).sort({ startDate: 1 });
        res.json({ success: true, data: labels });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { userId, areaId, startDate, endDate, caseNumber } = req.body;
        if (!userId || !areaId || !startDate || !endDate || !caseNumber) {
            return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
        }
        const start = new Date(startDate);
        const end   = new Date(endDate);
        // Elimina etiquetas que se superpongan para este usuario
        await CaseLabel.deleteMany({
            userId, areaId,
            startDate: { $lte: end },
            endDate:   { $gte: start },
        });
        const label = await new CaseLabel({
            userId, areaId,
            startDate: start, endDate: end,
            month: start.getUTCMonth(),
            year:  start.getUTCFullYear(),
            caseNumber: caseNumber.trim(),
        }).save();
        res.status(201).json({ success: true, data: label });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { caseNumber, startDate, endDate } = req.body;
        const label = await CaseLabel.findById(id);
        if (!label) return res.status(404).json({ success: false, message: 'No encontrado' });
        if (caseNumber !== undefined) label.caseNumber = caseNumber.trim();
        if (startDate) {
            label.startDate = new Date(startDate);
            label.month = label.startDate.getUTCMonth();
            label.year  = label.startDate.getUTCFullYear();
        }
        if (endDate) label.endDate = new Date(endDate);
        await label.save();
        res.json({ success: true, data: label });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const label = await CaseLabel.findByIdAndDelete(req.params.id);
        if (!label) return res.status(404).json({ success: false, message: 'No encontrado' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Limpia todas las etiquetas que se superponen con el rango indicado
exports.clearRange = async (req, res) => {
    try {
        const { userId, areaId, startDate, endDate } = req.body;
        if (!userId || !areaId || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Faltan campos' });
        }
        await CaseLabel.deleteMany({
            userId, areaId,
            startDate: { $lte: new Date(endDate) },
            endDate:   { $gte: new Date(startDate) },
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.searchCaseNumbers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) return res.json({ success: true, data: [] });
        const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const results = await CaseLabel.distinct('caseNumber', { caseNumber: { $regex: regex } });
        const ql = q.toLowerCase();
        const sorted = results
            .filter(Boolean)
            .sort((a, b) => {
                const as = a.toLowerCase().startsWith(ql);
                const bs = b.toLowerCase().startsWith(ql);
                return as !== bs ? (as ? -1 : 1) : a.localeCompare(b);
            })
            .slice(0, 10);
        res.json({ success: true, data: sorted });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
