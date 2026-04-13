const Asistencia = require('../models/Asistencia');
const ScheduleConfig = require('../models/ScheduleConfig');
const User = require('../models/User');
const Sede = require('../models/Sede');

exports.insertAsistencia = async (req, res) => {
    try {
        const { userId, tipo, latitude, longitude } = req.body;
        const markedByUserId = req.user?.userId || req.user?.sub || null;

        if (!userId || !tipo || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'userId, tipo, latitude y longitude son requeridos',
            });
        }

        if (!markedByUserId) {
            return res.status(401).json({
                success: false,
                message: 'No se pudo identificar al usuario que realiza la marcación',
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        const markedByUser = await User.findById(markedByUserId);
        if (!markedByUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario autenticado no encontrado',
            });
        }

        const [sede, scheduleConfig] = await Promise.all([
            user.sede ? Sede.findById(user.sede) : null,
            ScheduleConfig.findOne({ userId, active: true }).lean(),
        ]);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        let asistencia = await Asistencia.findOne({
            user: userId,
            createdAt: {
                $gte: hoy,
                $lt: manana,
            },
        });

        const ahora = new Date();
        const daySchedule = getExpectedDaySchedule(scheduleConfig, ahora);
        const flexibleMinutes = scheduleConfig?.isFlexible === false ? 0 : (scheduleConfig?.flexibleMinutes || 0);
        let esUbicacionValida = true;
        if (sede && sede.latitude && sede.longitude && sede.radio) {
            const distancia = calcularDistancia(
                latitude,
                longitude,
                parseFloat(sede.latitude),
                parseFloat(sede.longitude)
            );
            esUbicacionValida = distancia <= sede.radio;
        }

        if (!asistencia) {
            if (tipo === 'entrada') {
                const scheduleCompliance = buildEntryCompliance(ahora, daySchedule, flexibleMinutes);
                asistencia = new Asistencia({
                    user: userId,
                    entrada: ahora,
                    marcado_por_entrada: markedByUser._id,
                    latitude_entrada: latitude,
                    longitude_entrada: longitude,
                    valido_entrada: esUbicacionValida,
                    sede: user.sede,
                    expectedSchedule: daySchedule,
                    scheduleCompliance,
                    scheduleConfigSnapshot: buildScheduleConfigSnapshot(scheduleConfig),
                });
            } else {
                const scheduleCompliance = buildExitCompliance(ahora, daySchedule, flexibleMinutes, {});
                asistencia = new Asistencia({
                    user: userId,
                    salida: ahora,
                    marcado_por_salida: markedByUser._id,
                    latitude_salida: latitude,
                    longitude_salida: longitude,
                    valido_salida: esUbicacionValida,
                    sede: user.sede,
                    expectedSchedule: daySchedule,
                    scheduleCompliance,
                    scheduleConfigSnapshot: buildScheduleConfigSnapshot(scheduleConfig),
                });
            }
        } else {
            if (tipo === 'entrada') {
                const scheduleCompliance = buildEntryCompliance(ahora, daySchedule, flexibleMinutes);
                asistencia.entrada = ahora;
                asistencia.marcado_por_entrada = markedByUser._id;
                asistencia.latitude_entrada = latitude;
                asistencia.longitude_entrada = longitude;
                asistencia.valido_entrada = esUbicacionValida;
                asistencia.expectedSchedule = daySchedule;
                asistencia.scheduleCompliance = {
                    ...asistencia.scheduleCompliance,
                    ...scheduleCompliance,
                };
                asistencia.scheduleConfigSnapshot = buildScheduleConfigSnapshot(scheduleConfig);
            } else if (tipo === 'salida') {
                const scheduleForExit = asistencia.expectedSchedule || daySchedule;
                asistencia.salida = ahora;
                asistencia.marcado_por_salida = markedByUser._id;
                asistencia.latitude_salida = latitude;
                asistencia.longitude_salida = longitude;
                asistencia.valido_salida = esUbicacionValida;
                if (asistencia.entrada) {
                    const entrada = new Date(asistencia.entrada);
                    const salida = new Date(asistencia.salida);
                    const diffMs = salida.getTime() - entrada.getTime();
                    const diffHoras = diffMs / (1000 * 60 * 60);
                    asistencia.horas_trabajadas = Math.max(0, diffHoras);
                }
                asistencia.expectedSchedule = scheduleForExit;
                asistencia.scheduleCompliance = buildExitCompliance(
                    ahora,
                    scheduleForExit,
                    flexibleMinutes,
                    asistencia.scheduleCompliance || {}
                );
                asistencia.scheduleConfigSnapshot = buildScheduleConfigSnapshot(scheduleConfig);
            }
        }

        await asistencia.save();

        // Poblar relaciones antes de devolver
        await asistencia.populate('user', 'name lname email');
        await asistencia.populate('marcado_por_entrada', 'name lname email');
        await asistencia.populate('marcado_por_salida', 'name lname email');

        res.json({
            success: true,
            data: asistencia,
            message: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`,
        });
    } catch (error) {
        console.error('Error en insertAsistencia:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Obtener asistencias por fecha específica
 */
exports.getAsistenciasByDate = async (req, res) => {
    try {
        const { fecha } = req.params; // Formato: YYYY-MM-DD

        if (!fecha) {
            return res.status(400).json({
                success: false,
                message: 'Fecha es requerida',
            });
        }

        // Parsear la fecha
        const [year, month, day] = fecha.split('-').map(Number);
        const fechaInicio = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const fechaFin = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

        const asistencias = await Asistencia.find({
            createdAt: {
                $gte: fechaInicio,
                $lte: fechaFin,
            },
        })
            .populate('user', 'name lname email dni position')
            .populate('marcado_por_entrada', 'name lname email')
            .populate('marcado_por_salida', 'name lname email')
            .populate('sede', 'nombre')
            .sort({ createdAt: -1 })
            .select('+scheduleCompliance +expectedSchedule +scheduleConfigSnapshot +similarity_entrada +similarity_salida');

        res.json(asistencias);
    } catch (error) {
        console.error('Error en getAsistenciasByDate:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Obtener asistencia de un usuario para hoy
 */
exports.getAsistenciaByUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Verificar que el usuario existe
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        // Buscar asistencia del día actual completo
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        const asistencia = await Asistencia.findOne({
            user: id,
            createdAt: {
                $gte: hoy,
                $lt: manana,
            },
        })
            .populate('user', 'name lname email dni position')
            .populate('marcado_por_entrada', 'name lname email')
            .populate('marcado_por_salida', 'name lname email')
            .populate('sede', 'nombre')
            .select('+scheduleCompliance +expectedSchedule +scheduleConfigSnapshot +similarity_entrada +similarity_salida');
        res.json({
            success: true,
            data: asistencia,
        });
    } catch (error) {
        console.error('Error en getAsistenciaByUser:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Obtener asistencias por rango de fechas
 */
exports.getAsistenciasByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate y endDate son requeridos',
            });
        }
        const fechaInicio = new Date(startDate);
        fechaInicio.setHours(0, 0, 0, 0);
        const fechaFin = new Date(endDate);
        fechaFin.setHours(23, 59, 59, 999);
        const asistencias = await Asistencia.find({
            createdAt: {
                $gte: fechaInicio,
                $lte: fechaFin,
            },
        })
            .populate('user', 'name lname email dni position')
            .populate('marcado_por_entrada', 'name lname email')
            .populate('marcado_por_salida', 'name lname email')
            .populate('sede', 'nombre')
            .sort({ createdAt: 1 });

        res.json({
            success: true,
            data: asistencias,
        });
    } catch (error) {
        console.error('Error en getAsistenciasByDateRange:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Obtener estadísticas de asistencias por mes
 */
exports.getAsistenciasStats = async (req, res) => {
    try {
        const { month, year, userId } = req.query;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'month y year son requeridos',
            });
        }

        const fechaInicio = new Date(parseInt(year), parseInt(month), 1, 0, 0, 0, 0);
        const fechaFin = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59, 999);

        const query = {
            createdAt: {
                $gte: fechaInicio,
                $lte: fechaFin,
            },
        };

        if (userId) {
            query.user = userId;
        }

        const asistencias = await Asistencia.find(query);

        const stats = {
            total: asistencias.length,
            conEntrada: asistencias.filter((a) => a.entrada).length,
            conSalida: asistencias.filter((a) => a.salida).length,
            completas: asistencias.filter((a) => a.entrada && a.salida).length,
            validasEntrada: asistencias.filter((a) => a.valido_entrada).length,
            validasSalida: asistencias.filter((a) => a.valido_salida).length,
            horasTotales: asistencias.reduce((sum, a) => sum + (a.horas_trabajadas || 0), 0),
        };

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Error en getAsistenciasStats:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Obtener todos los usuarios con su estado de asistencia para una fecha (vista admin)
 */
exports.getAsistenciasAdminByDate = async (req, res) => {
    try {
        const { fecha } = req.params;

        if (!fecha) {
            return res.status(400).json({ success: false, message: 'Fecha es requerida' });
        }

        const [year, month, day] = fecha.split('-').map(Number);
        const fechaInicio = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const fechaFin = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

        const [users, asistencias] = await Promise.all([
            User.find({ active: true })
                .populate('areas', 'name')
                .populate('role', 'name isAdmin')
                .populate('sede', 'nombre')
                .lean(),
            Asistencia.find({ createdAt: { $gte: fechaInicio, $lte: fechaFin } })
                .populate('marcado_por_entrada', 'name lname email')
                .populate('marcado_por_salida', 'name lname email')
                .populate('sede', 'nombre')
                .lean(),
        ]);

        const asistenciaMap = {};
        asistencias.forEach(a => {
            if (a.user) asistenciaMap[a.user.toString()] = a;
        });

        const result = users.map(user => ({
            user: {
                _id: user._id,
                name: user.name,
                lname: user.lname,
                email: user.email,
                dni: user.dni,
                position: user.position,
                photo: user.photo,
                areas: user.areas,
                role: user.role,
                sede: user.sede,
                hasEmbedding: Array.isArray(user.embedding) && user.embedding.length > 0,
            },
            asistencia: asistenciaMap[user._id.toString()] || null,
        }));

        res.json({ success: true, data: result, total: result.length });
    } catch (error) {
        console.error('Error en getAsistenciasAdminByDate:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Función auxiliar para calcular distancia entre dos puntos (Haversine)
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
}

function buildScheduleConfigSnapshot(scheduleConfig) {
    if (!scheduleConfig) return undefined;

    return {
        scheduleConfigId: scheduleConfig._id,
        configName: scheduleConfig.name,
        configColor: scheduleConfig.color,
    };
}

function getExpectedDaySchedule(scheduleConfig, date) {
    if (!scheduleConfig?.weekSchedule?.length) return undefined;

    const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        timeZone: 'America/Lima',
    });

    const weekdayMap = {
        monday: 'monday',
        tuesday: 'tuesday',
        wednesday: 'wednesday',
        thursday: 'thursday',
        friday: 'friday',
        saturday: 'saturday',
        sunday: 'sunday',
    };

    const weekday = formatter.format(date).toLowerCase();
    const dayKey = weekdayMap[weekday];

    return scheduleConfig.weekSchedule.find((item) => item.day === dayKey) || undefined;
}

function getMinutesInLima(date) {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Lima',
    });

    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);

    return hour * 60 + minute;
}

function parseTimeToMinutes(time) {
    const [hours, minutes] = String(time || '00:00').split(':').map(Number);
    return (hours * 60) + minutes;
}

function buildEntryCompliance(date, daySchedule, flexibleMinutes) {
    const base = {
        isLateEntry: false,
        minutesLateEntry: 0,
        isEarlyDeparture: false,
        minutesEarlyDeparture: 0,
        flexibleMinutesApplied: flexibleMinutes,
        wasFlexible: flexibleMinutes > 0,
    };

    if (!daySchedule?.isWorkday || !daySchedule.periods?.length) {
        return base;
    }

    const entryMinutes = getMinutesInLima(date);
    const firstPeriodStart = parseTimeToMinutes(daySchedule.periods[0].start);
    const lateMinutes = Math.max(0, entryMinutes - firstPeriodStart - flexibleMinutes);

    return {
        ...base,
        isLateEntry: lateMinutes > 0,
        minutesLateEntry: lateMinutes,
    };
}

function buildExitCompliance(date, daySchedule, flexibleMinutes, existingCompliance) {
    const base = {
        isLateEntry: existingCompliance?.isLateEntry || false,
        minutesLateEntry: existingCompliance?.minutesLateEntry || 0,
        isEarlyDeparture: false,
        minutesEarlyDeparture: 0,
        flexibleMinutesApplied: flexibleMinutes,
        wasFlexible: flexibleMinutes > 0,
    };

    if (!daySchedule?.isWorkday || !daySchedule.periods?.length) {
        return base;
    }

    const exitMinutes = getMinutesInLima(date);
    const lastPeriod = daySchedule.periods[daySchedule.periods.length - 1];
    const lastPeriodEnd = parseTimeToMinutes(lastPeriod.end);
    const earlyMinutes = Math.max(0, lastPeriodEnd - flexibleMinutes - exitMinutes);

    return {
        ...base,
        isEarlyDeparture: earlyMinutes > 0,
        minutesEarlyDeparture: earlyMinutes,
    };
}
