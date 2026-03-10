const Gasto = require('../models/Gasto')
const mongoose = require('mongoose');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { uploadToGCS } = require('../utils/googleCloud');

require('dotenv')

const genAI = new GoogleGenerativeAI('AIzaSyAheayc0VWeMd8Fx1zc8kpnqo9hwMcAD8M');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const registrarGasto = async (req, res) => {
    try {
        let gastoData = req.body;
        if (typeof gastoData.items === 'string') {
            gastoData.items = JSON.parse(gastoData.items);
        }
        if (req.file) {
            const imageUrl = await uploadToGCS(req.file);
            gastoData.img_url = imageUrl;
        }
        const gasto = new Gasto(gastoData);
        await gasto.save();
        res.status(200).send({
            ok: 'Successfull',
            gasto: gasto
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
};

const getGastosByTaskId = async (req, res) => {
    try {
        const { taskId } = req.params;
        const gastos = await Gasto.find({ taskId }).sort({ createdAt: -1 }).select('-items').populate('user costCenter_1 costCenter_2 costCenter_3');
        res.status(200).send(gastos);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
}

const getGastosByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const gastos = await Gasto.find({ user: userId }).sort({ createdAt: -1 }).limit(20).select('-items');
        res.status(200).send(gastos);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
}

const editGastoById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Gasto.findByIdAndUpdate(id, req.body, { new: true });
        if (!result) {
            return res.status(404).send({ error: 'El gasto no existe' });
        }
        res.status(200).send({ ok: 'Successful' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
}

const getGastoById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Gasto.findById(id).populate('costCenter_1 costCenter_2 costCenter_3');
        if (!result) {
            return res.status(404).send({ error: 'El gasto no existe' });
        }
        res.status(200).send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
}

// ✅ NUEVO: Marcar/desmarcar gasto como revisado
const toggleGastoRevisado = async (req, res) => {
    try {
        const { id } = req.params;
        const { revisado, userId, comentario } = req.body;

        // Validar que el gasto existe
        const gasto = await Gasto.findById(id);
        if (!gasto) {
            return res.status(404).send({ error: 'El gasto no existe' });
        }

        // Preparar datos de actualización
        const updateData = {
            revisado: revisado === true,
            revisado_por: revisado ? userId : null,
            fecha_revision: revisado ? new Date() : null,
            comentario_revision: revisado ? (comentario || null) : null
        };

        // Actualizar el gasto
        const result = await Gasto.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('revisado_por', 'nombre apellido');

        res.status(200).send({
            ok: 'Gasto actualizado correctamente',
            gasto: result
        });
    } catch (error) {
        console.error('Error al actualizar estado de revisión:', error);
        res.status(500).send({ error: 'Error on server' });
    }
};

// ✅ NUEVO: Obtener estadísticas de gastos revisados
const getEstadisticasRevision = async (req, res) => {
    try {
        const { taskId } = req.params;

        const stats = await Gasto.aggregate([
            { $match: { taskId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    revisados: {
                        $sum: { $cond: ['$revisado', 1, 0] }
                    },
                    pendientes: {
                        $sum: { $cond: ['$revisado', 0, 1] }
                    }
                }
            }
        ]);

        const result = stats.length > 0 ? stats[0] : {
            total: 0,
            revisados: 0,
            pendientes: 0
        };

        res.status(200).json(result);
    } catch (error) {
        console.error('Error al obtener estadísticas de revisión:', error);
        res.status(500).json({ error: 'Error on server' });
    }
};

const getGastosByGroupCategoria = async (req, res) => {
    try {
        const { giraId } = req.params;
        const gastos = await Gasto.aggregate([
            {
                $match: { gira: new mongoose.Types.ObjectId(giraId) }
            },
            {
                $group: {
                    _id: { categoria: "$categoria", moneda: "$moneda" },
                    total: { $sum: "$total" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    categoria: "$_id.categoria",
                    moneda: "$_id.moneda",
                    total: 1,
                    count: 1
                }
            },
            {
                $sort: { categoria: 1, moneda: 1 }
            }
        ]);
        res.status(200).json(gastos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor" });
    }
};

const captureVoucher = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const mimeType = req.file.mimetype; // 'image/jpeg', 'image/png', 'application/pdf'
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

        if (!allowedTypes.includes(mimeType)) {
            return res.status(400).json({ error: 'Formato no soportado. Usa imagen (JPG, PNG) o PDF.' });
        }
        const prompt = `
                        Analiza la imagen proporcionada y determina si corresponde a una factura, comprobante o un recibo de pago.  
                        Si es válido el recibo de pago, extrae la información solicitada y devuélvela en formato JSON.  
                        Si un campo no está presente o no se puede leer, coloca el valor como null.  
                        Estructura de salida esperada (en JSON):
                        {
                          "esValido": boolean,
                          "motivoNoEsValido": string | null,
                            "razon_social": string,
                            "ruc": string,
                            "moneda": 'PEN' | 'USD' | 'EUR',
                            "fecha_emision": YYYY-MM-DD hh:mm:ss,
                            "categoria": 'alimentacion' | 'movilidad' | 'hospedeje' | 'otros'
                            "items": [
                            {
                            "descripcion": String,
                            "cantidad": number,
                            "precio_unitario": number,
                            "subtotal": number,
                            }],
                            "igv": number,
                            "total": number,
                            "descuento": number,
                            "detraccion":number,
                            "descripcion": string (Resumen del gasto)
                        }
                        Recuerda:
                        - Devuelve estrictamente el JSON sin texto adicional.  
                        - Usa null en los campos que no se encuentren en la factura.
    `
        const imageBase64 = req.file.buffer.toString('base64');
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType,
                    data: imageBase64,
                },
            },
        ]);

        let text = result.response.text();
        text = text.replace(/```json|```/g, '').trim();
        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            console.error("Error parsing JSON:", err);
            return res.status(500).json({ error: 'Error parsing AI response', raw: text });
        }
        res.status(200).json(data);
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({ error: 'Error generating content', message: error.message });
    }
}

const getDashboardStats = async (req, res) => {
    try {
        const {
            fechaInicio,
            fechaFin,
            usuario,
            gira,
            tipo,
            categoria,
            con_sustento,
            revisado // ✅ Nuevo filtro
        } = req.query;

        // Construir filtro base
        let baseFilter = {};

        // Filtro por fechas
        if (fechaInicio || fechaFin) {
            baseFilter.fecha_emision = {};
            if (fechaInicio) {
                baseFilter.fecha_emision.$gte = new Date(fechaInicio);
            }
            if (fechaFin) {
                const endDate = new Date(fechaFin);
                endDate.setHours(23, 59, 59, 999);
                baseFilter.fecha_emision.$lte = endDate;
            }
        }

        // Filtros adicionales
        if (usuario) {
            const usuariosArray = usuario.split(',');
            baseFilter.user = { $in: usuariosArray.map(id => new mongoose.Types.ObjectId(id)) };
        }

        if (gira) {
            const girasArray = gira.split(',');
            baseFilter.gira = { $in: girasArray.map(id => new mongoose.Types.ObjectId(id)) };
        }

        if (tipo) {
            const tiposArray = tipo.split(',');
            baseFilter.tipo = { $in: tiposArray };
        }

        if (categoria) {
            const categoriasArray = categoria.split(',');
            baseFilter.categoria = { $in: categoriasArray };
        }

        if (con_sustento) {
            baseFilter.con_sustento = con_sustento === 'true';
        }

        // ✅ Nuevo filtro por revisado
        if (revisado !== undefined) {
            baseFilter.revisado = revisado === 'true';
        }

        // Total de gastos
        const total = await Gasto.countDocuments(baseFilter);

        // Monto total por moneda
        const montosPorMoneda = await Gasto.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: '$moneda',
                    total: { $sum: '$total' }
                }
            }
        ]);

        const montosPEN = montosPorMoneda.find(m => m._id === 'PEN')?.total || 0;
        const montosUSD = montosPorMoneda.find(m => m._id === 'USD')?.total || 0;
        const montosEUR = montosPorMoneda.find(m => m._id === 'EUR')?.total || 0;

        // Gastos por categoría
        const porCategoria = await Gasto.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: '$categoria',
                    total: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // Gastos por tipo (viático o compra)
        const porTipo = await Gasto.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: '$tipo',
                    total: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Gastos con/sin sustento
        const porSustento = await Gasto.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: '$con_sustento',
                    count: { $sum: 1 },
                    total: { $sum: '$total' }
                }
            }
        ]);

        // ✅ Gastos revisados/pendientes
        const porRevision = await Gasto.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: '$revisado',
                    count: { $sum: 1 },
                    total: { $sum: '$total' }
                }
            }
        ]);

        // Tendencia mensual (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const tendenciaMensual = await Gasto.aggregate([
            {
                $match: {
                    fecha_emision: { $gte: sixMonthsAgo },
                    ...baseFilter
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$fecha_emision' },
                        month: { $month: '$fecha_emision' },
                        tipo: '$tipo'
                    },
                    total: { $sum: '$total' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Gastos modificados
        const modificados = await Gasto.countDocuments({
            ...baseFilter,
            modificado: true
        });

        // Gastos por usuario (top 5)
        const porUsuario = await Gasto.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: '$user',
                    total: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $project: {
                    _id: 1,
                    total: 1,
                    count: 1,
                    nombre: {
                        $concat: [
                            { $arrayElemAt: ['$userInfo.nombre', 0] },
                            ' ',
                            { $arrayElemAt: ['$userInfo.apellido', 0] }
                        ]
                    }
                }
            }
        ]);

        // Promedio de gastos
        const promedioGastos = total > 0 ? (montosPEN + montosUSD) / total : 0;

        // Gastos por moneda
        const porMoneda = await Gasto.aggregate([
            { $match: baseFilter },
            {
                $group: {
                    _id: '$moneda',
                    count: { $sum: 1 },
                    total: { $sum: '$total' }
                }
            }
        ]);

        res.status(200).json({
            total,
            montosPEN,
            montosUSD,
            montosEUR,
            porCategoria,
            porTipo,
            porSustento,
            porRevision, // ✅ Nueva estadística
            tendenciaMensual,
            modificados,
            porUsuario,
            promedioGastos,
            porMoneda
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = {
    captureVoucher,
    registrarGasto,
    getGastosByTaskId,
    getGastosByGroupCategoria,
    editGastoById,
    getGastoById,
    getGastosByUser,
    getDashboardStats,
    toggleGastoRevisado, // ✅ Nuevo método
    getEstadisticasRevision // ✅ Nuevo método
}