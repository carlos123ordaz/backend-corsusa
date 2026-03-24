const Area = require('../models/Area');
const User = require('../models/User');

// Obtener todas las áreas
exports.getAllAreas = async (req, res) => {
    try {
        const areas = await Area.find({ status: 'active' }).sort({ name: 1 });
        res.json(areas);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Obtener área por ID
exports.getAreaById = async (req, res) => {
    try {
        const area = await Area.findById(req.params.id);
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Área no encontrada',
            });
        }
        res.json(area);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Crear nueva área
exports.createArea = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del área es requerido',
            });
        }

        // Verificar si el área ya existe
        const existingArea = await Area.findOne({ name: name.toUpperCase() });
        if (existingArea) {
            return res.status(400).json({
                success: false,
                message: 'Esta área ya existe',
            });
        }

        const area = new Area({
            name: name.toUpperCase(),
            description: description || '',
        });

        await area.save();

        res.status(201).json({
            success: true,
            data: area,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Actualizar área
exports.updateArea = async (req, res) => {
    try {
        const { name, description, status } = req.body;

        const area = await Area.findById(req.params.id);
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Área no encontrada',
            });
        }

        const oldName = area.name;

        if (name) area.name = name.toUpperCase();
        if (description !== undefined) area.description = description;
        if (status) area.status = status;

        await area.save();

        // Si el nombre cambió, actualizar los usuarios que tienen esta área
        if (name && oldName !== area.name) {
            await User.updateMany(
                { areas: oldName },
                { $set: { 'areas.$[elem]': area.name } },
                { arrayFilters: [{ elem: oldName }] }
            );
        }

        res.json({
            success: true,
            data: area,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Eliminar área
exports.deleteArea = async (req, res) => {
    try {
        const area = await Area.findById(req.params.id);
        if (!area) {
            return res.status(404).json({
                success: false,
                message: 'Área no encontrada',
            });
        }

        // Verificar si hay usuarios asignados a esta área
        const usersWithArea = await User.countDocuments({ areas: area.name });
        if (usersWithArea > 0) {
            return res.status(400).json({
                success: false,
                message: `No se puede eliminar el área porque hay ${usersWithArea} usuario(s) asignado(s)`,
            });
        }

        await Area.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Área eliminada correctamente',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};