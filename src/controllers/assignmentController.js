const Assignment = require('../models/Assignment');
const User = require('../models/User');

exports.getAllAssignments = async (req, res) => {
    try {
        const { areaId } = req.params;
        const assignments = await Assignment.find({ areaId })
            .populate('userId', 'name')
            .sort({ startDate: -1 });
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAssignmentsByMonth = async (req, res) => {
    try {
        const { month, year, areaId } = req.params;
        const assignments = await Assignment.find({
            areaId,
            month: parseInt(month),
            year: parseInt(year),
        })
            .populate('userId', 'name')
            .populate('areaId', 'name')
            .sort({ 'userId.name': 1, startDate: 1 });
        res.json({ success: true, data: assignments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAssignmentsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        const assignments = await Assignment.find({ userId }).sort({ startDate: -1 });
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAssignmentsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'startDate y endDate son requeridos' });
        }
        const assignments = await Assignment.find({
            startDate: { $lte: new Date(endDate) },
            endDate: { $gte: new Date(startDate) },
        })
            .populate('userId', 'name')
            .sort({ startDate: 1 });
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createAssignment = async (req, res) => {
    try {
        const { userId, workTypeCode, startDate, endDate, areaId, caseNumber } = req.body;
        if (!userId || !workTypeCode || !startDate || !endDate || !areaId) {
            return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
        }
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
            return res.status(400).json({ success: false, message: 'La fecha inicial no puede ser mayor a la fecha final' });
        }

        // Eliminar asignaciones que se superpongan con el nuevo rango
        await Assignment.deleteMany({
            userId,
            areaId,
            startDate: { $lte: end },
            endDate: { $gte: start },
        });

        const assignment = new Assignment({
            userId,
            workTypeCode: workTypeCode.toUpperCase(),
            startDate: start,
            endDate: end,
            month: start.getMonth(),
            year: start.getFullYear(),
            areaId,
            caseNumber: caseNumber || '',
        });
        await assignment.save();
        res.status(201).json({ success: true, data: assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { workTypeCode, startDate, endDate, caseNumber } = req.body;
        const assignment = await Assignment.findById(id);
        if (!assignment) return res.status(404).json({ success: false, message: 'Asignación no encontrada' });

        if (workTypeCode) assignment.workTypeCode = workTypeCode.toUpperCase();
        if (startDate) {
            const start = new Date(startDate);
            assignment.startDate = start;
            assignment.month = start.getMonth();
            assignment.year = start.getFullYear();
        }
        if (endDate) assignment.endDate = new Date(endDate);
        if (caseNumber !== undefined) assignment.caseNumber = caseNumber;
        await assignment.save();
        res.json({ success: true, data: assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await Assignment.findByIdAndDelete(id);
        if (!assignment) return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
        res.json({ success: true, message: 'Asignación eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.bulkDeleteAssignments = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Se requiere un array de ids' });
        }
        const result = await Assignment.deleteMany({ _id: { $in: ids } });
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.partialDeleteAssignments = async (req, res) => {
    try {
        const { deletions } = req.body;
        // deletions = [{ entryId: string, datesToRemove: string[] (ISO dates) }]
        if (!Array.isArray(deletions) || deletions.length === 0) {
            return res.status(400).json({ success: false, message: 'Se requiere un array de deletions' });
        }

        // Normaliza una fecha a clave "YYYY-M-D" en UTC para comparar días sin hora
        const dateKey = (d) => {
            const date = new Date(d);
            return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
        };

        const created = [];

        for (const { entryId, datesToRemove } of deletions) {
            const assignment = await Assignment.findById(entryId);
            if (!assignment) continue;

            const removeSet = new Set((datesToRemove || []).map(dateKey));

            // Itera cada día del rango y agrupa los que sobreviven en segmentos contiguos
            const cur = new Date(assignment.startDate);
            const end = new Date(assignment.endDate);
            let segStart = null;
            let segEnd = null;
            const segments = [];

            while (cur <= end) {
                if (!removeSet.has(dateKey(cur))) {
                    if (!segStart) segStart = new Date(cur);
                    segEnd = new Date(cur);
                } else {
                    if (segStart) {
                        segments.push({ start: new Date(segStart), end: new Date(segEnd) });
                        segStart = null; segEnd = null;
                    }
                }
                cur.setUTCDate(cur.getUTCDate() + 1);
            }
            if (segStart) segments.push({ start: segStart, end: segEnd });

            await Assignment.findByIdAndDelete(entryId);

            for (const seg of segments) {
                const saved = await new Assignment({
                    userId: assignment.userId,
                    workTypeCode: assignment.workTypeCode,
                    areaId: assignment.areaId,
                    startDate: seg.start,
                    endDate: seg.end,
                    month: seg.start.getUTCMonth(),
                    year: seg.start.getUTCFullYear(),
                    caseNumber: assignment.caseNumber,
                }).save();
                created.push(saved);
            }
        }

        res.json({ success: true, data: created });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.searchCaseNumbers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) {
            return res.json({ success: true, data: [] });
        }
        const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const results = await Assignment.distinct('caseNumber', {
            caseNumber: { $regex: regex, $ne: '', $exists: true },
        });

        // Prioriza coincidencias que empiezan con el query
        const q_lower = q.toLowerCase();
        const sorted = results
            .filter(Boolean)
            .sort((a, b) => {
                const aStart = a.toLowerCase().startsWith(q_lower);
                const bStart = b.toLowerCase().startsWith(q_lower);
                if (aStart !== bStart) return aStart ? -1 : 1;
                return a.localeCompare(b);
            })
            .slice(0, 10);

        res.json({ success: true, data: sorted });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteAssignmentsByUserAndMonth = async (req, res) => {
    try {
        const { userId, month, year } = req.params;
        const result = await Assignment.deleteMany({
            userId,
            month: parseInt(month),
            year: parseInt(year),
        });
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
