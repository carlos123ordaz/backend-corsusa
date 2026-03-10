// controllers/laborRateController.js
const LaborRate = require('../models/LaborRate');
const { sendSuccess, sendError } = require('../helpers/responseHelper');

const getLaborRates = async (req, res) => {
    try {
        const { type, is_active } = req.query;
        const filter = {};

        if (type) filter.type = type;
        if (is_active !== undefined) filter.is_active = is_active === 'true';

        const data = await LaborRate.find(filter)
            .sort({ effective_date: -1 })
            .lean();

        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message);
    }
};

/**
 * GET /api/labor-rates/current/:type
 * Devuelve la tarifa activa más reciente por tipo (service|project)
 */
const getCurrentRate = async (req, res) => {
    try {
        const { type } = req.params;
        if (!['service', 'project'].includes(type)) {
            return sendError(res, 'Tipo debe ser "service" o "project"', 400);
        }

        const rate = await LaborRate.findOne({
            type,
            is_active: true,
            effective_date: { $lte: new Date() },
        })
            .sort({ effective_date: -1 })
            .lean();

        if (!rate) return sendError(res, `No hay tarifa ${type} activa`, 404);
        return sendSuccess(res, rate);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const getLaborRate = async (req, res) => {
    try {
        const rate = await LaborRate.findById(req.params.id).lean();
        if (!rate) return sendError(res, 'Tarifa no encontrada', 404);
        return sendSuccess(res, rate);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const createLaborRate = async (req, res) => {
    try {
        const rate = new LaborRate(req.body);
        await rate.save();
        return sendSuccess(res, rate, 201);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return sendError(res, Object.values(error.errors).map(e => e.message).join(', '), 400);
        }
        return sendError(res, error.message);
    }
};

const updateLaborRate = async (req, res) => {
    try {
        const updated = await LaborRate.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).lean();
        if (!updated) return sendError(res, 'Tarifa no encontrada', 404);
        return sendSuccess(res, updated);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const deleteLaborRate = async (req, res) => {
    try {
        const updated = await LaborRate.findByIdAndUpdate(
            req.params.id,
            { $set: { is_active: false } },
            { new: true }
        );
        if (!updated) return sendError(res, 'Tarifa no encontrada', 404);
        return sendSuccess(res, { message: 'Tarifa desactivada' });
    } catch (error) {
        return sendError(res, error.message);
    }
};

module.exports = { getLaborRates, getCurrentRate, getLaborRate, createLaborRate, updateLaborRate, deleteLaborRate };