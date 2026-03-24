const Asistencia = require('../models/Asistencia');
const User = require('../models/User');
const Sede = require('../models/Sede');

exports.insertAsistencia = async (req, res) => {
    try {
        const { userId, tipo, latitude, longitude } = req.body;

        if (!userId || !tipo || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'userId, tipo, latitude y longitude son requeridos',
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
        }

        const sede = user.sede ? await Sede.findById(user.sede) : null;
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
                asistencia = new Asistencia({
                    user: userId,
                    entrada: ahora,
                    latitude_entrada: latitude,
                    longitude_entrada: longitude,
                    valido_entrada: esUbicacionValida,
                    sede: user.sede,
                });
            } else {
                asistencia = new Asistencia({
                    user: userId,
                    salida: ahora,
                    latitude_salida: latitude,
                    longitude_salida: longitude,
                    valido_salida: esUbicacionValida,
                    sede: user.sede,
                });
            }
        } else {
            if (tipo === 'entrada') {
                asistencia.entrada = ahora;
                asistencia.latitude_entrada = latitude;
                asistencia.longitude_entrada = longitude;
                asistencia.valido_entrada = esUbicacionValida;
            } else if (tipo === 'salida') {
                asistencia.salida = ahora;
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
            }
        }

        await asistencia.save();

        // Poblar usuario antes de devolver
        await asistencia.populate('user', 'name lname email');

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
            .populate('sede', 'nombre')
            .sort({ createdAt: -1 });

        console.log('1')
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

        // Buscar asistencia de hoy
        const hoy = new Date();
        const year = hoy.getUTCFullYear(), month = hoy.getUTCMonth(), day = hoy.getUTCDate();
        const manana = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
        const asistencia = await Asistencia.findOne({
            user: id,
            createdAt: {
                $gte: hoy,
                $lt: manana,
            },
        })
            .populate('user', 'name lname email dni position')
            .populate('sede', 'nombre');
        console.log('asistencia: ', asistencia)
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
