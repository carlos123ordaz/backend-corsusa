// controllers/quotationController.js
const Quotation = require('../models/Quotation');
const { recalcFullQuotation, recalcQuotationTotals } = require('../helpers/pricingHelper');
const { sendSuccess, sendError, sendPaginated } = require('../helpers/responseHelper');

/**
 * GET /api/quotations
 * Lista con filtros, búsqueda y paginación
 */
const getQuotations = async (req, res) => {
    try {
        const {
            search = '',
            status,
            client_id,
            responsible_id,
            date_from,
            date_to,
            page = 1,
            limit = 20,
        } = req.query;
        const filter = {};
        if (search) {
            filter.$or = [
                { reference: { $regex: search, $options: 'i' } },
                { full_reference: { $regex: search, $options: 'i' } },
                { client_name: { $regex: search, $options: 'i' } },
            ];
        }

        if (status) filter.status = status;
        if (client_id) filter.client_id = client_id;
        if (responsible_id) filter['responsible.staff_id'] = responsible_id;

        if (date_from || date_to) {
            filter.createdAt = {};
            if (date_from) filter.createdAt.$gte = new Date(date_from);
            if (date_to) filter.createdAt.$lte = new Date(date_to + 'T23:59:59.999Z');
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [data, total] = await Promise.all([
            Quotation.find(filter)
                .select('offer_number revision full_reference client_name prepared_by responsible status offer_type totals.final_price_total totals.margin_percentage createdAt updatedAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Quotation.countDocuments(filter),
        ]);

        return sendPaginated(res, { data, total, page: pageNum, limit: limitNum });
    } catch (error) {
        console.error('getQuotations error:', error);
        return sendError(res, error.message);
    }
};

/**
 * GET /api/quotations/:id
 * Cotización completa con todas las secciones/items
 */
const getQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id).lean();

        if (!quotation) {
            return sendError(res, 'Cotización no encontrada', 404);
        }
        return sendSuccess(res, quotation);
    } catch (error) {
        console.error('getQuotation error:', error);
        return sendError(res, error.message);
    }
};

/**
 * POST /api/quotations
 * Crear nueva cotización con recálculo automático
 */
const createQuotation = async (req, res) => {
    try {
        let data = { ...req.body };

        // Generar full_reference si no viene
        if (data.reference && data.revision && !data.full_reference) {
            data.full_reference = `${data.reference}-${data.revision}`;
        }

        // Recalcular pricing completo antes de guardar
        data = recalcFullQuotation(data);

        const quotation = new Quotation(data);
        await quotation.save();

        return sendSuccess(res, quotation, 201);
    } catch (error) {
        console.error('createQuotation error:', error);

        if (error.code === 11000) {
            return sendError(res, 'Ya existe una cotización con esa referencia', 409);
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return sendError(res, messages.join(', '), 400);
        }

        return sendError(res, error.message);
    }
};

/**
 * PUT /api/quotations/:id
 * Actualizar cotización con recálculo automático
 */
const updateQuotation = async (req, res) => {
    try {
        const existing = await Quotation.findById(req.params.id);
        if (!existing) {
            return sendError(res, 'Cotización no encontrada', 404);
        }

        let data = { ...req.body };

        // Recalcular si vienen sections
        if (data.sections) {
            data = recalcFullQuotation(data);
        }

        // Actualizar full_reference si cambia referencia o revisión
        if (data.reference || data.revision) {
            const ref = data.reference || existing.reference;
            const rev = data.revision || existing.revision;
            data.full_reference = `${ref}-${rev}`;
        }

        const updated = await Quotation.findByIdAndUpdate(
            req.params.id,
            { $set: data },
            { new: true, runValidators: true }
        ).lean();

        return sendSuccess(res, updated);
    } catch (error) {
        console.error('updateQuotation error:', error);

        if (error.code === 11000) {
            return sendError(res, 'Ya existe una cotización con esa referencia', 409);
        }

        return sendError(res, error.message);
    }
};

/**
 * DELETE /api/quotations/:id
 */
const deleteQuotation = async (req, res) => {
    try {
        const deleted = await Quotation.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return sendError(res, 'Cotización no encontrada', 404);
        }
        return sendSuccess(res, { message: 'Cotización eliminada' });
    } catch (error) {
        console.error('deleteQuotation error:', error);
        return sendError(res, error.message);
    }
};

/**
 * POST /api/quotations/:id/revision
 * Crear nueva revisión copiando la cotización actual
 */
const createRevision = async (req, res) => {
    try {
        const original = await Quotation.findById(req.params.id).lean();
        if (!original) {
            return sendError(res, 'Cotización original no encontrada', 404);
        }

        // Incrementar revisión (001 → 002, etc.)
        const currentRev = parseInt(original.revision) || 0;
        const newRev = String(currentRev + 1).padStart(3, '0');

        // Eliminar campos que no deben copiarse
        const { _id, __v, createdAt, updatedAt, sent_at, ...copyData } = original;

        // Limpiar _ids de sub-documentos para que Mongo genere nuevos
        if (copyData.sections) {
            copyData.sections = copyData.sections.map(section => {
                const { _id: sId, ...sec } = section;
                sec.items = (sec.items || []).map(item => {
                    const { _id: iId, ...it } = item;
                    it.sub_items = (it.sub_items || []).map(sub => {
                        const { _id: subId, ...s } = sub;
                        return s;
                    });
                    return it;
                });
                return sec;
            });
        }

        const revisionData = {
            ...copyData,
            revision: newRev,
            full_reference: `${original.reference}-${newRev}`,
            status: 'Preparado',
        };

        const revision = new Quotation(revisionData);
        await revision.save();

        return sendSuccess(res, revision, 201);
    } catch (error) {
        console.error('createRevision error:', error);

        if (error.code === 11000) {
            return sendError(res, 'Ya existe esa revisión', 409);
        }

        return sendError(res, error.message);
    }
};

/**
 * GET /api/quotations/generate-reference
 * Auto-genera el próximo número de referencia basado en el año actual
 * Formato: YY-XXXXXXXX
 */
const generateReference = async (req, res) => {
    try {
        const year = new Date().getFullYear().toString().slice(-2);
        const prefix = `${year}-`;

        // Buscar la última referencia del año actual
        const last = await Quotation.findOne(
            { reference: { $regex: `^${prefix}` } },
            { reference: 1 },
            { sort: { reference: -1 } }
        ).lean();

        let nextNum = 10000001;
        if (last) {
            const lastNum = parseInt(last.reference.replace(prefix, '')) || 10000000;
            nextNum = lastNum + 1;
        }

        const reference = `${prefix}${String(nextNum).padStart(8, '0')}`;

        return sendSuccess(res, {
            reference,
            full_reference: `${reference}-001`,
        });
    } catch (error) {
        console.error('generateReference error:', error);
        return sendError(res, error.message);
    }
};

/**
 * POST /api/quotations/:id/recalculate
 * Fuerza recálculo de pricing sin cambiar datos
 */
const recalculateQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) {
            return sendError(res, 'Cotización no encontrada', 404);
        }

        const obj = quotation.toObject();
        const recalced = recalcFullQuotation(obj);

        quotation.sections = recalced.sections;
        quotation.totals = recalced.totals;
        await quotation.save();

        return sendSuccess(res, quotation);
    } catch (error) {
        console.error('recalculateQuotation error:', error);
        return sendError(res, error.message);
    }
};

module.exports = {
    getQuotations,
    getQuotation,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    createRevision,
    generateReference,
    recalculateQuotation,
};