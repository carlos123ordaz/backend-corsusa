const mongoose = require('mongoose');
const Incidencia = require('../models/Incidencia');
const incidenciaService = require('../services/incidenciaService');
const { notificarRecordatorioDeadline } = require('../services/firebaseAdminService');

// ─── Helper para manejar errores del servicio ────────────────────────

const handleServiceError = (res, error) => {
    console.error(error.message || error);
    const status = error.status || 500;
    const message = status === 500 ? 'Error en el servidor' : error.message;
    return res.status(status).json({ error: message });
};

// ─── CRUD ────────────────────────────────────────────────────────────

const registrarIncidencia = async (req, res) => {
    try {
        const files = req.files?.length > 0 ? req.files : req.file ? [req.file] : [];
        const incidencia = await incidenciaService.crearIncidencia(req.body, files);
        res.status(200).json({ ok: 'Successful', incidencia });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getAllIncidencias = async (req, res) => {
    try {
        const result = await incidenciaService.obtenerIncidencias(req.query);
        res.status(200).json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getIncidenciasByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const incidencias = await Incidencia.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('user', 'nombre apellido correo')
            .populate('asigned', 'nombre apellido correo');
        res.status(200).json(incidencias);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getIncidenciaById = async (req, res) => {
    try {
        const incidencia = await incidenciaService.obtenerPorId(req.params.id);
        res.status(200).json(incidencia);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const editIncidenciaById = async (req, res) => {
    try {
        const resultado = await incidenciaService.actualizarIncidencia(
            req.params.id,
            req.body,
            req.files
        );
        res.status(200).json({ ok: 'Successful', incidencia: resultado });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const deleteIncidenciaById = async (req, res) => {
    try {
        await incidenciaService.eliminarIncidencia(req.params.id);
        res.status(200).json({ ok: 'Incidencia eliminada correctamente' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// ─── Imágenes ────────────────────────────────────────────────────────

const deleteImageFromIncidencia = async (req, res) => {
    try {
        await incidenciaService.eliminarImagenDeIncidencia(req.params.id, req.body.imageUrl);
        res.status(200).json({ ok: 'Imagen eliminada correctamente' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const addResolutionImages = async (req, res) => {
    try {
        const urls = await incidenciaService.agregarImagenesResolucion(req.params.id, req.files);
        res.status(200).json({ ok: 'Imágenes de resolución agregadas correctamente', imagenes: urls });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const saveAnnotatedImage = async (req, res) => {
    try {
        const { originalUrl, annotatedImageBase64 } = req.body;
        const annotatedUrl = await incidenciaService.guardarImagenAnotada(
            req.params.id,
            originalUrl,
            annotatedImageBase64
        );
        res.status(200).json({ ok: 'Imagen anotada guardada correctamente', annotatedUrl });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// ─── Estadísticas (se mantienen en el controlador por ser queries específicas) ──

const getIncidenciasStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const matchStage = userId
            ? [{ $match: { user: new mongoose.Types.ObjectId(userId) } }]
            : [];

        const [porSeveridad, porTipo, porEstado] = await Promise.all([
            Incidencia.aggregate([...matchStage, { $group: { _id: '$gradoSeveridad', count: { $sum: 1 } } }]),
            Incidencia.aggregate([...matchStage, { $group: { _id: '$tipoIncidente', count: { $sum: 1 } } }]),
            Incidencia.aggregate([...matchStage, { $group: { _id: '$estado', count: { $sum: 1 } } }]),
        ]);

        res.status(200).json({ porSeveridad, porTipo, porEstado });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getIncidenciasAsignadas = async (req, res) => {
    try {
        const { userId } = req.params;
        const incidencias = await Incidencia.find({
            asigned: userId,
            estado: { $in: ['En Revisión', 'Resuelto'] },
        })
            .populate('user', 'nombre apellido correo')
            .populate('asigned', 'nombre apellido correo')
            .populate('historialEstados.user', 'nombre apellido')
            .populate('historialDeadline.user', 'nombre apellido')
            .sort({ _id: -1 })
            .limit(20);

        res.status(200).json(incidencias);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getIncidenciasAsignadasStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const now = new Date();

        const [total, enRevision, vencidas, resueltas] = await Promise.all([
            Incidencia.countDocuments({ asigned: userId, estado: { $in: ['En Revisión', 'Resuelto'] } }),
            Incidencia.countDocuments({ asigned: userId, estado: 'En Revisión' }),
            Incidencia.countDocuments({ asigned: userId, estado: 'En Revisión', deadline: { $lt: now } }),
            Incidencia.countDocuments({ asigned: userId, estado: 'Resuelto' }),
        ]);

        res.status(200).json({ total, enRevision, vencidas, resueltas });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, estado, severidad } = req.query;

        const baseFilter = {};

        if (fechaInicio || fechaFin) {
            baseFilter.fecha = {};
            if (fechaInicio) baseFilter.fecha.$gte = new Date(fechaInicio);
            if (fechaFin) {
                const endDate = new Date(fechaFin);
                endDate.setHours(23, 59, 59, 999);
                baseFilter.fecha.$lte = endDate;
            }
        }
        if (estado) baseFilter.estado = { $in: estado.split(',') };
        if (severidad) baseFilter.gradoSeveridad = { $in: severidad.split(',') };

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const now = new Date();

        const [
            total,
            porEstado,
            porSeveridad,
            porTipo,
            tendenciaMensual,
            areasAfectadas,
            tiempoResolucion,
            criticasAbiertas,
            vencidas,
        ] = await Promise.all([
            Incidencia.countDocuments(baseFilter),
            Incidencia.aggregate([{ $match: baseFilter }, { $group: { _id: '$estado', count: { $sum: 1 } } }]),
            Incidencia.aggregate([{ $match: baseFilter }, { $group: { _id: '$gradoSeveridad', count: { $sum: 1 } } }]),
            Incidencia.aggregate([
                { $match: baseFilter },
                { $group: { _id: '$tipoIncidente', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 6 },
            ]),
            Incidencia.aggregate([
                { $match: { fecha: { $gte: sixMonthsAgo }, ...baseFilter } },
                { $group: { _id: { year: { $year: '$fecha' }, month: { $month: '$fecha' } }, count: { $sum: 1 } } },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
            ]),
            Incidencia.aggregate([
                { $match: baseFilter },
                { $group: { _id: '$areaAfectada', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
            Incidencia.aggregate([
                { $match: { estado: 'Resuelto', ...baseFilter } },
                { $project: { dias: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 86400000] } } },
                { $group: { _id: null, promedio: { $avg: '$dias' } } },
            ]),
            Incidencia.countDocuments({
                gradoSeveridad: 'Crítico',
                estado: { $in: ['Pendiente', 'En Revisión'] },
                ...baseFilter,
            }),
            Incidencia.countDocuments({
                deadline: { $lt: now },
                estado: { $in: ['Pendiente', 'En Revisión'] },
                ...baseFilter,
            }),
        ]);

        res.status(200).json({
            total,
            porEstado,
            porSeveridad,
            porTipo,
            tendenciaMensual,
            areasAfectadas,
            tiempoPromedioResolucion: tiempoResolucion[0]?.promedio || 0,
            criticasAbiertas,
            vencidas,
        });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// ─── Recordatorios ───────────────────────────────────────────────────

/**
 * POST /incidencias/:id/recordatorio
 * Envía un recordatorio manual al asignado de una incidencia en revisión.
 */
const enviarRecordatorio = async (req, res) => {
    try {
        const incidencia = await incidenciaService.obtenerPorId(req.params.id);

        if (incidencia.estado !== 'En Revisión') {
            return res.status(400).json({
                error: 'Solo se pueden enviar recordatorios para incidencias en estado "En Revisión"',
            });
        }

        if (!incidencia.asigned) {
            return res.status(400).json({
                error: 'La incidencia no tiene un usuario asignado',
            });
        }

        const resultado = await incidenciaService.enviarRecordatorioIncidencia(
            incidencia,
            notificarRecordatorioDeadline
        );

        res.status(200).json({
            ok: 'Recordatorio enviado correctamente',
            detalle: resultado,
        });
    } catch (error) {
        handleServiceError(res, error);
    }
};

/**
 * POST /incidencias/recordatorios/enviar-masivo
 * Envía recordatorios a todas las incidencias en revisión próximas a vencer.
 */
const enviarRecordatoriosMasivo = async (req, res) => {
    try {
        const { diasAnticipacion = 2 } = req.body;
        const incidencias = await incidenciaService.obtenerIncidenciasParaRecordatorio(diasAnticipacion);

        const resultados = [];
        for (const inc of incidencias) {
            try {
                const r = await incidenciaService.enviarRecordatorioIncidencia(
                    inc,
                    notificarRecordatorioDeadline
                );
                if (r) resultados.push(r);
            } catch (err) {
                console.error(`Error enviando recordatorio para ${inc._id}:`, err);
            }
        }

        res.status(200).json({
            ok: `${resultados.length} recordatorio(s) enviado(s)`,
            total: incidencias.length,
            enviados: resultados.length,
            detalles: resultados,
        });
    } catch (error) {
        handleServiceError(res, error);
    }
};

module.exports = {
    registrarIncidencia,
    getIncidenciasByUser,
    getAllIncidencias,
    getIncidenciaById,
    editIncidenciaById,
    deleteIncidenciaById,
    deleteImageFromIncidencia,
    getIncidenciasStats,
    getIncidenciasAsignadas,
    getIncidenciasAsignadasStats,
    addResolutionImages,
    saveAnnotatedImage,
    getDashboardStats,
    enviarRecordatorio,
    enviarRecordatoriosMasivo,
};