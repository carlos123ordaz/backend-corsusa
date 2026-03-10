const Incidencia = require('../models/Incidencia');
const Usuario = require('../models/User');
const { uploadToGCS, deleteFromGCS } = require('../utils/googleCloud');
const {
    notificarIncidenciaAsignada,
    notificarIncidenciaEnRevision,
    notificarIncidenciaResuelta,
} = require('./firebaseAdminService');

// ─── Helpers de imágenes ─────────────────────────────────────────────

/**
 * Sube múltiples archivos a GCS y retorna las URLs.
 */
const subirImagenes = async (files) => {
    const urls = [];
    for (const file of files) {
        const url = await uploadToGCS(file);
        urls.push(url);
    }
    return urls;
};

/**
 * Elimina múltiples imágenes de GCS (silencia errores individuales).
 */
const eliminarImagenes = async (urls) => {
    for (const url of urls) {
        try {
            await deleteFromGCS(url);
        } catch (err) {
            console.error('Error al eliminar imagen de GCS:', err);
        }
    }
};

/**
 * Resuelve las imágenes finales para una actualización.
 * Maneja: reemplazo total, agregar nuevas, conservar existentes.
 */
const resolverImagenesUpdate = async (files, body, imagenesAnteriores) => {
    const existingImages = parseExistingImages(body.existingImages);
    const hasNewFiles = files && files.length > 0;
    const replaceAll = body.replaceImages === 'true';

    if (!hasNewFiles && existingImages.length > 0) {
        return existingImages;
    }

    if (!hasNewFiles && existingImages.length === 0) {
        return null; // No modificar imágenes
    }

    // Hay archivos nuevos
    if (replaceAll) {
        await eliminarImagenes(imagenesAnteriores || []);
        return subirImagenes(files);
    }

    // Agregar nuevas a las existentes
    const nuevasUrls = await subirImagenes(files);
    return [...existingImages, ...nuevasUrls];
};

const parseExistingImages = (raw) => {
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        console.error('Error parseando existingImages');
        return [];
    }
};

// ─── Helpers de deadline ─────────────────────────────────────────────

/**
 * Prepara los campos de actualización de deadline si aplica.
 */
const prepararDeadlineUpdate = (updateData, incidenciaAnterior) => {
    if (updateData.newDeadline === undefined) return updateData;
    if (incidenciaAnterior.estado !== 'En Revisión') return updateData;

    return {
        ...updateData,
        deadlineAnterior: incidenciaAnterior.deadline,
        deadlineNuevo: updateData.newDeadline,
        notasDeadline: updateData.notasDeadline || '',
    };
};

// ─── Notificaciones ──────────────────────────────────────────────────

/**
 * Envía notificaciones según el cambio de estado/asignación.
 */
const enviarNotificaciones = async (updateData, incidenciaAnterior, incidenciaActualizada) => {
    const cambioAsignado =
        updateData.asigned &&
        updateData.asigned !== incidenciaAnterior.asigned?.toString();

    const cambioARevision =
        updateData.estado === 'En Revisión' &&
        incidenciaAnterior.estado !== 'En Revisión';

    const cambioAResuelto =
        updateData.estado === 'Resuelto' &&
        incidenciaAnterior.estado !== 'Resuelto';

    if (cambioAsignado) {
        const usuario = await Usuario.findById(updateData.asigned)
            .select('name lname email pushToken pushTokens');
        if (usuario) await notificarIncidenciaAsignada(usuario, incidenciaActualizada);
    }

    if (cambioARevision) {
        const usuario = await Usuario.findById(
            incidenciaActualizada.asigned?._id || incidenciaActualizada.asigned
        ).select('name lname email pushToken pushTokens');
        if (usuario) await notificarIncidenciaEnRevision(usuario, incidenciaActualizada);
    }

    if (cambioAResuelto) {
        const usuario = await Usuario.findById(
            incidenciaActualizada.user?._id || incidenciaActualizada.user
        ).select('name lname email pushToken pushTokens');
        if (usuario) await notificarIncidenciaResuelta(usuario, incidenciaActualizada);
    }
};

// ─── Populates reutilizables ─────────────────────────────────────────

const POPULATE_FULL = [
    { path: 'user', select: 'name lname email' },
    { path: 'asigned', select: 'name lname email pushToken pushTokens' },
    { path: 'historialEstados.user', select: 'name lname email' },
    { path: 'historialDeadline.user', select: 'name lname email' },
];

const POPULATE_BASIC = [
    { path: 'user', select: 'name lname email' },
    { path: 'asigned', select: 'name lname email pushToken pushTokens' },
    { path: 'historialEstados.user', select: 'name lname email' },
    { path: 'historialDeadline.user', select: 'name lname email' },
];

// ─── Operaciones principales ─────────────────────────────────────────

const crearIncidencia = async (data, files) => {
    if (files && files.length > 0) {
        data.imagenes = await subirImagenes(files);
    } else if (data.file) {
        data.imagenes = [await uploadToGCS(data.file)];
    }

    const incidencia = new Incidencia(data);
    incidencia.historialEstados = [{
        estado: 'Pendiente',
        fecha: new Date(),
        user: data.user,
    }];

    await incidencia.save();
    return incidencia;
};

const obtenerIncidencias = async ({ page = 1, limit = 20, estado, gradoSeveridad, fechaInicio, fechaFin, search }) => {
    const query = {};

    if (estado) query.estado = estado;
    if (gradoSeveridad) query.gradoSeveridad = gradoSeveridad;

    if (fechaInicio || fechaFin) {
        query.fecha = {};
        if (fechaInicio) query.fecha.$gte = new Date(fechaInicio);
        if (fechaFin) {
            const endDate = new Date(fechaFin);
            endDate.setHours(23, 59, 59, 999);
            query.fecha.$lte = endDate;
        }
    }

    if (search) {
        query.$or = [
            { tipoIncidente: { $regex: search, $options: 'i' } },
            { ubicacion: { $regex: search, $options: 'i' } },
            { descripcion: { $regex: search, $options: 'i' } },
            { areaAfectada: { $regex: search, $options: 'i' } },
        ];
    }

    const [incidencias, total] = await Promise.all([
        Incidencia.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate(POPULATE_BASIC),
        Incidencia.countDocuments(query),
    ]);

    return {
        incidencias,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
    };
};

const obtenerPorId = async (id) => {
    const incidencia = await Incidencia.findById(id).populate(POPULATE_BASIC);
    if (!incidencia) throw Object.assign(new Error('Incidencia no encontrada'), { status: 404 });
    return incidencia;
};

/**
 * Actualización general de una incidencia (refactorizada).
 */
const actualizarIncidencia = async (id, body, files) => {
    const anterior = await Incidencia.findById(id);
    if (!anterior) throw Object.assign(new Error('Incidencia no encontrada'), { status: 404 });

    // 1. Resolver imágenes
    let updateData = { ...body };
    const imagenes = await resolverImagenesUpdate(files, body, anterior.imagenes);
    if (imagenes !== null) {
        updateData.imagenes = imagenes;
    }

    // Limpiar campos auxiliares
    delete updateData.existingImages;
    delete updateData.replaceImages;

    // 2. Notas de estado
    if (updateData.estado) {
        updateData.notasEstado = body.notasEstado || '';
    }

    // 3. Deadline
    updateData = prepararDeadlineUpdate(updateData, anterior);
    delete updateData.newDeadline;

    // 4. Guardar
    const resultado = await Incidencia.findByIdAndUpdate(id, updateData, { new: true })
        .populate(POPULATE_FULL);

    if (!resultado) throw Object.assign(new Error('Incidencia no encontrada'), { status: 404 });

    // 5. Notificaciones
    await enviarNotificaciones(updateData, anterior, resultado);

    return resultado;
};

const eliminarIncidencia = async (id) => {
    const incidencia = await Incidencia.findById(id);
    if (!incidencia) throw Object.assign(new Error('Incidencia no encontrada'), { status: 404 });

    // Eliminar todas las imágenes asociadas
    await eliminarImagenes(incidencia.imagenes || []);
    await eliminarImagenes(incidencia.imagenesResolucion || []);

    if (incidencia.imagenesAnotadas?.length > 0) {
        const anotadas = incidencia.imagenesAnotadas
            .filter((img) => img.anotada)
            .map((img) => img.anotada);
        await eliminarImagenes(anotadas);
    }

    await Incidencia.findByIdAndDelete(id);
};

const agregarImagenesResolucion = async (id, files) => {
    const incidencia = await Incidencia.findById(id);
    if (!incidencia) throw Object.assign(new Error('Incidencia no encontrada'), { status: 404 });

    if (!['Resuelto', 'En Revisión'].includes(incidencia.estado)) {
        throw Object.assign(
            new Error('Solo se pueden agregar fotos de resolución en estado "En Revisión" o "Resuelto"'),
            { status: 400 }
        );
    }

    const urls = await subirImagenes(files || []);

    await Incidencia.findByIdAndUpdate(id, {
        $push: { imagenesResolucion: { $each: urls } },
    });

    return urls;
};

const guardarImagenAnotada = async (id, originalUrl, annotatedImageBase64) => {
    const incidencia = await Incidencia.findById(id);
    if (!incidencia) throw Object.assign(new Error('Incidencia no encontrada'), { status: 404 });

    const buffer = Buffer.from(annotatedImageBase64.split(',')[1], 'base64');
    const annotatedUrl = await uploadToGCS({
        buffer,
        mimetype: 'image/png',
        originalname: `annotated_${Date.now()}.png`,
    });

    await Incidencia.findByIdAndUpdate(id, {
        $push: {
            imagenesAnotadas: {
                original: originalUrl,
                anotada: annotatedUrl,
                fechaAnotacion: new Date(),
            },
        },
    });

    return annotatedUrl;
};

const eliminarImagenDeIncidencia = async (id, imageUrl) => {
    const incidencia = await Incidencia.findById(id);
    if (!incidencia) throw Object.assign(new Error('Incidencia no encontrada'), { status: 404 });

    await deleteFromGCS(imageUrl);
    await Incidencia.findByIdAndUpdate(id, { $pull: { imagenes: imageUrl } });
};

// ─── Recordatorios ───────────────────────────────────────────────────

/**
 * Obtiene incidencias en revisión que están próximas a vencer o ya vencidas.
 * @param {number} diasAnticipacion - Días antes del deadline para considerar "próximo a vencer"
 */
const obtenerIncidenciasParaRecordatorio = async (diasAnticipacion = 2) => {
    const ahora = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + diasAnticipacion);

    return Incidencia.find({
        estado: 'En Revisión',
        asigned: { $ne: null },
        deadline: { $ne: null, $lte: limite },
    }).populate([
        { path: 'asigned', select: 'name lname email pushToken pushTokens' },
        { path: 'user', select: 'name lname email' },
    ]);
};

/**
 * Envía un recordatorio individual para una incidencia.
 */
const enviarRecordatorioIncidencia = async (incidencia, notificarRecordatorio) => {
    if (!incidencia.asigned) return null;

    const ahora = new Date();
    const vencida = incidencia.deadline < ahora;
    await notificarRecordatorio(incidencia.asigned, incidencia, { vencida });

    return {
        incidenciaId: incidencia._id,
        asignado: `${incidencia.asigned.name} ${incidencia.asigned.lname}`,
        deadline: incidencia.deadline,
        vencida,
    };
};

module.exports = {
    crearIncidencia,
    obtenerIncidencias,
    obtenerPorId,
    actualizarIncidencia,
    eliminarIncidencia,
    agregarImagenesResolucion,
    guardarImagenAnotada,
    eliminarImagenDeIncidencia,
    obtenerIncidenciasParaRecordatorio,
    enviarRecordatorioIncidencia,
    subirImagenes,
    eliminarImagenes,
};