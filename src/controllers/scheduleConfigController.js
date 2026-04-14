
const ScheduleConfig = require('../models/ScheduleConfig');
const User = require('../models/User');

// Obtener todas las configuraciones de horarios
exports.getAllScheduleConfigs = async (req, res) => {
    try {
        const scheduleConfigs = await ScheduleConfig.find()
            .populate('userId', 'name lname email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: scheduleConfigs,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Obtener configuración de horario por ID
exports.getScheduleConfigById = async (req, res) => {
    try {
        const { id } = req.params;

        const scheduleConfig = await ScheduleConfig.findById(id)
            .populate('userId', 'name lname email');

        if (!scheduleConfig) {
            return res.status(404).json({
                success: false,
                message: 'Configuración de horario no encontrada',
            });
        }

        res.json({
            success: true,
            data: scheduleConfig,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Obtener configuración de horario por usuario
exports.getScheduleConfigByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        // Buscar configuración activa del usuario (solo debe haber una)
        const scheduleConfig = await ScheduleConfig.findOne({
            userId,
            active: true,
        });

        res.json({
            success: true,
            data: scheduleConfig,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Crear o actualizar configuración de horario
exports.createScheduleConfig = async (req, res) => {
    try {
        const {
            userId,
            name,
            description,
            color,
            flexibleMinutes,
            isFlexible,
            remoteDays,
            weekSchedule,
            totalWeeklyHours,
        } = req.body;

        if (!userId || !name || !weekSchedule || totalWeeklyHours === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos requeridos deben ser proporcionados',
            });
        }

        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        // ✅ CAMBIO IMPORTANTE: Buscar si ya existe un horario activo para este usuario
        let scheduleConfig = await ScheduleConfig.findOne({
            userId,
            active: true,
        });

        if (scheduleConfig) {
            // ✅ Si existe, ACTUALIZAR el documento existente
            scheduleConfig.name = name;
            scheduleConfig.description = description || '';
            scheduleConfig.color = color || '#FFC0CB';
            scheduleConfig.flexibleMinutes = flexibleMinutes || 30;
            scheduleConfig.isFlexible = isFlexible ?? true;
            scheduleConfig.remoteDays = Array.isArray(remoteDays) ? remoteDays : [];
            scheduleConfig.weekSchedule = weekSchedule;
            scheduleConfig.totalWeeklyHours = totalWeeklyHours;

            await scheduleConfig.save();

            const populatedConfig = await ScheduleConfig.findById(scheduleConfig._id)
                .populate('userId', 'name lname email');

            return res.status(200).json({
                success: true,
                data: populatedConfig,
                message: 'Configuración de horario actualizada correctamente',
            });
        } else {
            // ✅ Si NO existe, crear uno nuevo
            scheduleConfig = new ScheduleConfig({
                userId,
                name,
                description: description || '',
                color: color || '#FFC0CB',
                flexibleMinutes: flexibleMinutes || 30,
                isFlexible: isFlexible ?? true,
                remoteDays: Array.isArray(remoteDays) ? remoteDays : [],
                weekSchedule,
                totalWeeklyHours,
                active: true,
            });

            await scheduleConfig.save();

            const populatedConfig = await ScheduleConfig.findById(scheduleConfig._id)
                .populate('userId', 'name lname email');

            return res.status(201).json({
                success: true,
                data: populatedConfig,
                message: 'Configuración de horario creada correctamente',
            });
        }
    } catch (error) {
        console.error('Error en createScheduleConfig:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Actualizar configuración de horario (método separado, aunque ya se maneja en createScheduleConfig)
exports.updateScheduleConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const scheduleConfig = await ScheduleConfig.findById(id);
        if (!scheduleConfig) {
            return res.status(404).json({
                success: false,
                message: 'Configuración de horario no encontrada',
            });
        }

        // Actualizar campos
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] !== undefined) {
                scheduleConfig[key] = updateData[key];
            }
        });

        await scheduleConfig.save();

        const populatedConfig = await ScheduleConfig.findById(scheduleConfig._id)
            .populate('userId', 'name lname email');

        res.json({
            success: true,
            data: populatedConfig,
            message: 'Configuración de horario actualizada correctamente',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Eliminar configuración de horario (soft delete - marcar como inactivo)
exports.deleteScheduleConfig = async (req, res) => {
    try {
        const { id } = req.params;

        const scheduleConfig = await ScheduleConfig.findById(id);
        if (!scheduleConfig) {
            return res.status(404).json({
                success: false,
                message: 'Configuración de horario no encontrada',
            });
        }

        // Soft delete: marcar como inactivo en lugar de eliminar
        scheduleConfig.active = false;
        await scheduleConfig.save();

        res.json({
            success: true,
            message: 'Configuración de horario eliminada correctamente',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Activar/desactivar configuración de horario
exports.toggleScheduleConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        const scheduleConfig = await ScheduleConfig.findById(id);
        if (!scheduleConfig) {
            return res.status(404).json({
                success: false,
                message: 'Configuración de horario no encontrada',
            });
        }

        scheduleConfig.active = active;
        await scheduleConfig.save();

        const populatedConfig = await ScheduleConfig.findById(scheduleConfig._id)
            .populate('userId', 'name lname email');

        res.json({
            success: true,
            data: populatedConfig,
            message: `Configuración de horario ${active ? 'activada' : 'desactivada'} correctamente`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Limpiar horarios inactivos antiguos (útil para mantenimiento)
exports.cleanupInactiveSchedules = async (req, res) => {
    try {
        // Eliminar horarios inactivos de más de 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await ScheduleConfig.deleteMany({
            active: false,
            updatedAt: { $lt: thirtyDaysAgo },
        });

        res.json({
            success: true,
            deletedCount: result.deletedCount,
            message: `${result.deletedCount} configuraciones inactivas eliminadas`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
