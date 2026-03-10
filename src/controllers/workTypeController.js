const WorkType = require('../models/WorkType');

// Obtener todos los tipos de trabajo
exports.getAllWorkTypes = async (req, res) => {
    try {
        const workTypes = await WorkType.find().sort({ code: 1 });
        res.json({
            success: true,
            data: workTypes,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Obtener tipo de trabajo por código
exports.getWorkTypeByCode = async (req, res) => {
    try {
        const workType = await WorkType.findOne({ code: req.params.code.toUpperCase() });
        if (!workType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de trabajo no encontrado',
            });
        }
        res.json({
            success: true,
            data: workType,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Crear nuevo tipo de trabajo
exports.createWorkType = async (req, res) => {
    try {
        const { code, label, color } = req.body;

        if (!code || !label || !color) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos',
            });
        }

        // Verificar si el código ya existe
        const existingWorkType = await WorkType.findOne({ code: code.toUpperCase() });
        if (existingWorkType) {
            return res.status(400).json({
                success: false,
                message: 'Este código de tipo de trabajo ya existe',
            });
        }

        const workType = new WorkType({
            code: code.toUpperCase(),
            label,
            color,
        });

        await workType.save();

        res.status(201).json({
            success: true,
            data: workType,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Actualizar tipo de trabajo
exports.updateWorkType = async (req, res) => {
    try {
        const { label, color } = req.body;

        const workType = await WorkType.findOne({ code: req.params.code.toUpperCase() });
        if (!workType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de trabajo no encontrado',
            });
        }

        if (label) workType.label = label;
        if (color) workType.color = color;

        await workType.save();

        res.json({
            success: true,
            data: workType,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Eliminar tipo de trabajo
exports.deleteWorkType = async (req, res) => {
    try {
        const workType = await WorkType.findOneAndDelete({ code: req.params.code.toUpperCase() });
        if (!workType) {
            return res.status(404).json({
                success: false,
                message: 'Tipo de trabajo no encontrado',
            });
        }

        res.json({
            success: true,
            message: 'Tipo de trabajo eliminado correctamente',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};