const Gasto = require('../models/Gasto')
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { uploadToGCS } = require('../utils/googleCloud');
const XLSX = require('xlsx');

require('dotenv')

const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// ─── Helper para popular allocations ───
const POPULATE_ALLOCATIONS = [
    { path: 'costCenterAllocations.costCenter_1' },
    { path: 'costCenterAllocations.costCenter_2' },
    { path: 'costCenterAllocations.costCenter_3' },
];

const registrarGasto = async (req, res) => {
    try {
        let gastoData = req.body;
        if (typeof gastoData.items === 'string') {
            gastoData.items = JSON.parse(gastoData.items);
        }
        if (typeof gastoData.costCenterAllocations === 'string') {
            gastoData.costCenterAllocations = JSON.parse(gastoData.costCenterAllocations);
        }
        if (req.file) {
            const imageUrl = await uploadToGCS(req.file);
            gastoData.img_url = imageUrl;
        }

        // Si viene con el formato nuevo, limpiar campos viejos
        if (gastoData.costCenterAllocations && gastoData.costCenterAllocations.length > 0) {
            delete gastoData.costCenter_1;
            delete gastoData.costCenter_2;
            delete gastoData.costCenter_3;
        }

        const gasto = new Gasto(gastoData);
        await gasto.save();
        res.status(200).send({
            ok: 'Successfull',
            gasto: gasto
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server', message: error.message });
    }
};

const getGastosByTaskId = async (req, res) => {
    try {
        const { taskId } = req.params;
        const gastos = await Gasto.find({ taskId })
            .sort({ createdAt: -1 })
            .select('-items')
            .populate('user')
            .populate(POPULATE_ALLOCATIONS);
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
        let updateData = req.body;

        if (typeof updateData.costCenterAllocations === 'string') {
            updateData.costCenterAllocations = JSON.parse(updateData.costCenterAllocations);
        }

        // Si viene con el formato nuevo, limpiar campos viejos
        if (updateData.costCenterAllocations && updateData.costCenterAllocations.length > 0) {
            updateData.costCenter_1 = null;
            updateData.costCenter_2 = null;
            updateData.costCenter_3 = null;
        }

        const result = await Gasto.findByIdAndUpdate(id, updateData, { new: true });
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
        const result = await Gasto.findById(id).populate(POPULATE_ALLOCATIONS);
        if (!result) {
            return res.status(404).send({ error: 'El gasto no existe' });
        }
        res.status(200).send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
}

const toggleGastoRevisado = async (req, res) => {
    try {
        const { id } = req.params;
        const { revisado, userId, comentario } = req.body;

        const gasto = await Gasto.findById(id);
        if (!gasto) {
            return res.status(404).send({ error: 'El gasto no existe' });
        }

        const updateData = {
            revisado: revisado === true,
            revisado_por: revisado ? userId : null,
            fecha_revision: revisado ? new Date() : null,
            comentario_revision: revisado ? (comentario || null) : null
        };

        const result = await Gasto.findByIdAndUpdate(id, updateData, { new: true })
            .populate('revisado_por', 'nombre apellido');

        res.status(200).send({ ok: 'Gasto actualizado correctamente', gasto: result });
    } catch (error) {
        console.error('Error al actualizar estado de revisión:', error);
        res.status(500).send({ error: 'Error on server' });
    }
};

const getEstadisticasRevision = async (req, res) => {
    try {
        const { taskId } = req.params;
        const stats = await Gasto.aggregate([
            { $match: { taskId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    revisados: { $sum: { $cond: ['$revisado', 1, 0] } },
                    pendientes: { $sum: { $cond: ['$revisado', 0, 1] } }
                }
            }
        ]);
        const result = stats.length > 0 ? stats[0] : { total: 0, revisados: 0, pendientes: 0 };
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
            { $match: { gira: new mongoose.Types.ObjectId(giraId) } },
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
            { $sort: { categoria: 1, moneda: 1 } }
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

        const mimeType = req.file.mimetype;
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
        `;

        const imageBase64 = req.file.buffer.toString('base64');
        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType, data: imageBase64 } },
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
        const { fechaInicio, fechaFin, usuario, gira, tipo, categoria, con_sustento, revisado } = req.query;

        let baseFilter = {};

        if (fechaInicio || fechaFin) {
            baseFilter.fecha_emision = {};
            if (fechaInicio) baseFilter.fecha_emision.$gte = new Date(fechaInicio);
            if (fechaFin) {
                const endDate = new Date(fechaFin);
                endDate.setUTCHours(23, 59, 59, 999);  // ← FIX
                baseFilter.fecha_emision.$lte = endDate;
            }
        }

        if (usuario) {
            baseFilter.user = { $in: usuario.split(',').map(id => new mongoose.Types.ObjectId(id)) };
        }
        if (gira) {
            baseFilter.gira = { $in: gira.split(',').map(id => new mongoose.Types.ObjectId(id)) };
        }
        if (tipo) baseFilter.tipo = { $in: tipo.split(',') };
        if (categoria) baseFilter.categoria = { $in: categoria.split(',') };
        if (con_sustento) baseFilter.con_sustento = con_sustento === 'true';
        if (revisado !== undefined) baseFilter.revisado = revisado === 'true';

        const total = await Gasto.countDocuments(baseFilter);

        const montosPorMoneda = await Gasto.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$moneda', total: { $sum: '$total' } } }
        ]);

        const montosPEN = montosPorMoneda.find(m => m._id === 'PEN')?.total || 0;
        const montosUSD = montosPorMoneda.find(m => m._id === 'USD')?.total || 0;
        const montosEUR = montosPorMoneda.find(m => m._id === 'EUR')?.total || 0;

        const porCategoria = await Gasto.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$categoria', total: { $sum: '$total' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]);

        const porTipo = await Gasto.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$tipo', total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]);

        const porSustento = await Gasto.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$con_sustento', count: { $sum: 1 }, total: { $sum: '$total' } } }
        ]);

        const porRevision = await Gasto.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$revisado', count: { $sum: 1 }, total: { $sum: '$total' } } }
        ]);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const tendenciaMensual = await Gasto.aggregate([
            { $match: { fecha_emision: { $gte: sixMonthsAgo }, ...baseFilter } },
            {
                $group: {
                    _id: { year: { $year: '$fecha_emision' }, month: { $month: '$fecha_emision' }, tipo: '$tipo' },
                    total: { $sum: '$total' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const modificados = await Gasto.countDocuments({ ...baseFilter, modificado: true });

        const porUsuario = await Gasto.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$user', total: { $sum: '$total' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'usuarios', localField: '_id', foreignField: '_id', as: 'userInfo' } },
            {
                $project: {
                    _id: 1, total: 1, count: 1,
                    nombre: { $concat: [{ $arrayElemAt: ['$userInfo.nombre', 0] }, ' ', { $arrayElemAt: ['$userInfo.apellido', 0] }] }
                }
            }
        ]);

        const promedioGastos = total > 0 ? (montosPEN + montosUSD) / total : 0;

        const porMoneda = await Gasto.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$moneda', count: { $sum: 1 }, total: { $sum: '$total' } } }
        ]);

        res.status(200).json({
            total, montosPEN, montosUSD, montosEUR, porCategoria, porTipo,
            porSustento, porRevision, tendenciaMensual, modificados,
            porUsuario, promedioGastos, porMoneda
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

const eliminarGasto = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Gasto.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).send({ error: 'El gasto no existe' });
        }
        res.status(200).send({ ok: 'Gasto eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
};

const importGastosFromExcel = async (req, res) => {
    try {
        const { taskId } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo.' });
        }

        const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

        if (aoa.length < 2) {
            return res.status(400).json({ error: 'El archivo no contiene datos.' });
        }

        // Mapear headers
        const rawHeaders = aoa[0].map(h => String(h ?? '').toLowerCase().trim());
        const COLS = {
            tipo: 'tipo', categoria: 'categoría', ruc: 'ruc', razon_social: 'razón social',
            fecha_emision: 'fecha emisión (yyyy-mm-dd)', moneda: 'moneda', total: 'total',
            igv: 'igv', descuento: 'descuento', detraccion: 'detracción',
            descripcion: 'descripción', con_sustento: 'con sustento (si/no)',
            cc_nivel1: 'cc nivel 1 (código)', cc_nivel2: 'cc nivel 2 (código)',
            cc_nivel3: 'cc nivel 3 (código)', cc_porcentaje: 'cc porcentaje (%)',
        };

        const colIdx = {};
        Object.entries(COLS).forEach(([key, headerText]) => {
            const idx = rawHeaders.findIndex(h => h === headerText || h === key);
            if (idx !== -1) colIdx[key] = idx;
        });

        const getCell = (row, key) => {
            const idx = colIdx[key];
            return idx !== undefined ? String(row[idx] ?? '').trim() : '';
        };
        const parseNum = val => {
            const n = parseFloat(String(val ?? 0).replace(',', '.'));
            return isNaN(n) ? 0 : n;
        };

        // Leer filas válidas
        const rows = [];
        for (let i = 1; i < aoa.length; i++) {
            const row = aoa[i];
            if (!row || row.every(c => !c)) continue;
            const tipo = getCell(row, 'tipo').toLowerCase();
            const fecha = getCell(row, 'fecha_emision');
            const total = parseNum(getCell(row, 'total'));
            if (!tipo || !fecha || !total) continue;
            rows.push({
                tipo, fecha, total,
                categoria: getCell(row, 'categoria').toLowerCase(),
                ruc: getCell(row, 'ruc'),
                razon_social: getCell(row, 'razon_social'),
                moneda: getCell(row, 'moneda').toUpperCase() || 'PEN',
                igv: parseNum(getCell(row, 'igv')),
                descuento: parseNum(getCell(row, 'descuento')),
                detraccion: parseNum(getCell(row, 'detraccion')),
                descripcion: getCell(row, 'descripcion'),
                con_sustento: getCell(row, 'con_sustento').toUpperCase() === 'SI',
                cc_nivel1: getCell(row, 'cc_nivel1'),
                cc_nivel2: getCell(row, 'cc_nivel2'),
                cc_nivel3: getCell(row, 'cc_nivel3'),
                cc_porcentaje: parseNum(getCell(row, 'cc_porcentaje')),
                _rowIndex: i + 1,
            });
        }

        // Agrupar por (ruc + fecha + total + razon_social)
        const gastoMap = new Map();
        rows.forEach(row => {
            const key = `${row.ruc}|${row.fecha}|${row.total}|${row.razon_social}`;
            if (!gastoMap.has(key)) {
                gastoMap.set(key, {
                    tipo: row.tipo, categoria: row.categoria, ruc: row.ruc,
                    razon_social: row.razon_social, fecha_emision: row.fecha,
                    moneda: row.moneda, total: row.total, igv: row.igv,
                    descuento: row.descuento, detraccion: row.detraccion,
                    descripcion: row.descripcion, con_sustento: row.con_sustento,
                    taskId, ccRows: [], rowIndex: row._rowIndex,
                });
            }
            if (row.cc_nivel1) {
                gastoMap.get(key).ccRows.push({
                    cc_nivel1: row.cc_nivel1, cc_nivel2: row.cc_nivel2,
                    cc_nivel3: row.cc_nivel3, cc_porcentaje: row.cc_porcentaje,
                });
            }
        });

        // Crear gastos
        const CostCenter = mongoose.models.CostCenter || mongoose.model('CostCenter', new mongoose.Schema({ code: String }));
        const created = [], errors = [];

        for (const [, data] of gastoMap.entries()) {
            try {
                const gastoData = {
                    tipo: data.tipo, categoria: data.categoria, ruc: data.ruc,
                    razon_social: data.razon_social, fecha_emision: data.fecha_emision,
                    moneda: data.moneda, total: data.total, igv: data.igv,
                    descuento: data.descuento, detraccion: data.detraccion,
                    descripcion: data.descripcion, con_sustento: data.con_sustento,
                    taskId,
                };

                // Resolver centros de costo por código
                if (data.ccRows.length > 0) {
                    const allocations = [];
                    for (const cc of data.ccRows) {
                        const cc1 = await CostCenter.findOne({ code: cc.cc_nivel1 });
                        if (!cc1) continue;
                        const alloc = { costCenter_1: cc1._id, percentage: cc.cc_porcentaje || 100 };
                        if (cc.cc_nivel2) {
                            const cc2 = await CostCenter.findOne({ code: cc.cc_nivel2 });
                            if (cc2) alloc.costCenter_2 = cc2._id;
                        }
                        if (cc.cc_nivel3) {
                            const cc3 = await CostCenter.findOne({ code: cc.cc_nivel3 });
                            if (cc3) alloc.costCenter_3 = cc3._id;
                        }
                        allocations.push(alloc);
                    }
                    if (allocations.length > 0) gastoData.costCenterAllocations = allocations;
                }

                const gasto = new Gasto(gastoData);
                await gasto.save();
                created.push(gasto._id);
            } catch (err) {
                errors.push({ row: data.rowIndex, message: err.message });
            }
        }

        res.status(200).json({ created: created.length, errors });
    } catch (error) {
        console.error('Error al importar gastos:', error);
        res.status(500).json({ error: 'Error en el servidor', message: error.message });
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
    toggleGastoRevisado,
    getEstadisticasRevision,
    eliminarGasto,
    importGastosFromExcel
}