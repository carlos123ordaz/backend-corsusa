const CostCenter = require('../models/CostCenter');

const costCenterController = {

    // Obtener todos los centros de costo
    getAll: async (req, res) => {
        try {
            const costCenters = await CostCenter.find({ status: true })
                .sort({ level: 1, code: 1 });

            res.status(200).json({
                success: true,
                data: costCenters
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener centros de costo',
                error: error.message
            });
        }
    },

    // Obtener centros de costo por nivel (para el primer selector)
    getByLevel: async (req, res) => {
        try {
            const { level } = req.params;
            const costCenters = await CostCenter.find({
                level: parseInt(level),
                status: 'active'
            }).sort({ code: 1 });

            res.status(200).json({
                success: true,
                data: costCenters
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener centros de costo por nivel',
                error: error.message
            });
        }
    },

    // Obtener centros de costo hijos por parent_code (para selectores 2 y 3)
    getByParentCode: async (req, res) => {
        try {
            const { parent_code } = req.params;

            const costCenters = await CostCenter.find({
                parent_code,
                status: 'active'
            }).sort({ code: 1 });

            res.status(200).json({
                success: true,
                data: costCenters
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener centros de costo hijos',
                error: error.message
            });
        }
    },

    // Obtener un centro de costo por código
    getByCode: async (req, res) => {
        try {
            const { code } = req.params;

            const costCenter = await CostCenter.findOne({ code });

            if (!costCenter) {
                return res.status(404).json({
                    success: false,
                    message: 'Centro de costo no encontrado'
                });
            }

            res.status(200).json({
                success: true,
                data: costCenter
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener centro de costo',
                error: error.message
            });
        }
    },

    // Crear un nuevo centro de costo
    create: async (req, res) => {
        try {
            const { code, description, status, level, parent_code } = req.body;

            // Validar que si el level es 2 o 3, debe tener parent_code
            if ((level === 2 || level === 3) && !parent_code) {
                return res.status(400).json({
                    success: false,
                    message: `El nivel ${level} requiere un parent_code`
                });
            }

            // Validar que si el level es 1, no debe tener parent_code
            if (level === 1 && parent_code) {
                return res.status(400).json({
                    success: false,
                    message: 'El nivel 1 no debe tener parent_code'
                });
            }

            // Si tiene parent_code, verificar que exista
            if (parent_code) {
                const parentExists = await CostCenter.findOne({ code: parent_code });
                if (!parentExists) {
                    return res.status(404).json({
                        success: false,
                        message: 'El centro de costo padre no existe'
                    });
                }

                // Verificar que el nivel sea correcto respecto al padre
                if (level !== parentExists.level + 1) {
                    return res.status(400).json({
                        success: false,
                        message: `El nivel debe ser ${parentExists.level + 1} (padre nivel ${parentExists.level} + 1)`
                    });
                }
            }

            const newCostCenter = new CostCenter({
                code,
                description,
                status: status !== undefined ? status : 'active',
                level,
                parent_code: parent_code || null
            });

            await newCostCenter.save();

            res.status(201).json({
                success: true,
                message: 'Centro de costo creado exitosamente',
                data: newCostCenter
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'El código del centro de costo ya existe'
                });
            }
            res.status(500).json({
                success: false,
                message: 'Error al crear centro de costo',
                error: error.message
            });
        }
    },

    // Actualizar un centro de costo
    update: async (req, res) => {
        try {
            const { code } = req.params;
            const updates = req.body;

            // No permitir cambiar el code o level una vez creado (opcional)
            delete updates.code;
            delete updates.level;

            const costCenter = await CostCenter.findOneAndUpdate(
                { code },
                updates,
                { new: true, runValidators: true }
            );

            if (!costCenter) {
                return res.status(404).json({
                    success: false,
                    message: 'Centro de costo no encontrado'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Centro de costo actualizado exitosamente',
                data: costCenter
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al actualizar centro de costo',
                error: error.message
            });
        }
    },

    // Eliminar (soft delete - cambiar status a false)
    delete: async (req, res) => {
        try {
            const { code } = req.params;

            // Verificar si tiene hijos
            const hasChildren = await CostCenter.findOne({ parent_code: code });
            if (hasChildren) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar un centro de costo con hijos'
                });
            }

            const costCenter = await CostCenter.findOneAndUpdate(
                { code },
                { status: false },
                { new: true }
            );

            if (!costCenter) {
                return res.status(404).json({
                    success: false,
                    message: 'Centro de costo no encontrado'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Centro de costo eliminado exitosamente'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al eliminar centro de costo',
                error: error.message
            });
        }
    },

    // Obtener estructura jerárquica completa
    getHierarchy: async (req, res) => {
        try {
            const level1 = await CostCenter.find({ level: 1, status: true }).sort({ code: 1 });

            const hierarchy = await Promise.all(level1.map(async (parent) => {
                const level2 = await CostCenter.find({
                    parent_code: parent.code,
                    level: 2,
                    status: true
                }).sort({ code: 1 });

                const children = await Promise.all(level2.map(async (child) => {
                    const level3 = await CostCenter.find({
                        parent_code: child.code,
                        level: 3,
                        status: true
                    }).sort({ code: 1 });

                    return {
                        ...child.toObject(),
                        children: level3
                    };
                }));

                return {
                    ...parent.toObject(),
                    children
                };
            }));

            res.status(200).json({
                success: true,
                data: hierarchy
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener jerarquía',
                error: error.message
            });
        }
    }
};

module.exports = costCenterController;