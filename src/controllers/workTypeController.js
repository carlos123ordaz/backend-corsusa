const WorkType = require('../models/WorkType');

exports.getAllWorkTypes = async (req, res) => {
    try {
        const { areaId } = req.query;
        if (!areaId) {
            return res.status(400).json({ success: false, message: 'areaId es requerido' });
        }
        const workTypes = await WorkType.find({ areaId }).sort({ code: 1 });
        res.json({ success: true, data: workTypes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getWorkTypeByCode = async (req, res) => {
    try {
        const { areaId } = req.query;
        const filter = { code: req.params.code.toUpperCase() };
        if (areaId) filter.areaId = areaId;
        const workType = await WorkType.findOne(filter);
        if (!workType) {
            return res.status(404).json({ success: false, message: 'Tipo de trabajo no encontrado' });
        }
        res.json({ success: true, data: workType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createWorkType = async (req, res) => {
    try {
        const { code, label, color, areaId } = req.body;

        if (!code || !label || !color || !areaId) {
            return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
        }

        const existing = await WorkType.findOne({ code: code.toUpperCase(), areaId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Este código ya existe en el área' });
        }

        const workType = new WorkType({ code: code.toUpperCase(), label, color, areaId });
        await workType.save();

        res.status(201).json({ success: true, data: workType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateWorkType = async (req, res) => {
    try {
        const { label, color, areaId } = req.body;
        const filter = { code: req.params.code.toUpperCase() };
        if (areaId) filter.areaId = areaId;

        const workType = await WorkType.findOne(filter);
        if (!workType) {
            return res.status(404).json({ success: false, message: 'Tipo de trabajo no encontrado' });
        }

        if (label) workType.label = label;
        if (color) workType.color = color;

        await workType.save();
        res.json({ success: true, data: workType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteWorkType = async (req, res) => {
    try {
        const { areaId } = req.query;
        const filter = { code: req.params.code.toUpperCase() };
        if (areaId) filter.areaId = areaId;

        const workType = await WorkType.findOneAndDelete(filter);
        if (!workType) {
            return res.status(404).json({ success: false, message: 'Tipo de trabajo no encontrado' });
        }

        res.json({ success: true, message: 'Tipo de trabajo eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
