// controllers/pricingFactorController.js
const PricingFactor = require('../models/PricingFactor');
const { sendSuccess, sendError } = require('../helpers/responseHelper');

const getPricingFactors = async (req, res) => {
    try {
        const { search, department, brand_code, is_active } = req.query;
        const filter = {};

        if (search) {
            filter.$or = [
                { spk_code: { $regex: search, $options: 'i' } },
                { spk_label: { $regex: search, $options: 'i' } },
                { full_label: { $regex: search, $options: 'i' } },
            ];
        }
        if (department) filter.department = department;
        if (brand_code) filter.brand_code = brand_code;
        if (is_active !== undefined) filter.is_active = is_active === 'true';
        const data = await PricingFactor.find(filter).sort({ spk_code: 1 }).lean();
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const getPricingFactor = async (req, res) => {
    try {
        const factor = await PricingFactor.findById(req.params.id).lean();
        if (!factor) return sendError(res, 'Factor no encontrado', 404);
        return sendSuccess(res, factor);
    } catch (error) {
        return sendError(res, error.message);
    }
};

/**
 * GET /api/pricing-factors/by-spk/:spkCode
 * Busca factor por código SPK (usado por el frontend al seleccionar SPK)
 */
const getPricingFactorBySpk = async (req, res) => {
    try {
        const factor = await PricingFactor.findOne({
            spk_code: req.params.spkCode,
            is_active: true,
        }).lean();

        if (!factor) return sendError(res, 'Factor SPK no encontrado', 404);
        return sendSuccess(res, factor);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const createPricingFactor = async (req, res) => {
    try {
        const factor = new PricingFactor(req.body);
        await factor.save();
        return sendSuccess(res, factor, 201);
    } catch (error) {
        if (error.code === 11000) return sendError(res, 'Código SPK duplicado', 409);
        if (error.name === 'ValidationError') {
            return sendError(res, Object.values(error.errors).map(e => e.message).join(', '), 400);
        }
        return sendError(res, error.message);
    }
};

const updatePricingFactor = async (req, res) => {
    try {
        const updated = await PricingFactor.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).lean();
        if (!updated) return sendError(res, 'Factor no encontrado', 404);
        return sendSuccess(res, updated);
    } catch (error) {
        if (error.code === 11000) return sendError(res, 'Código SPK duplicado', 409);
        return sendError(res, error.message);
    }
};

const deletePricingFactor = async (req, res) => {
    try {
        const updated = await PricingFactor.findByIdAndUpdate(
            req.params.id,
            { $set: { is_active: false } },
            { new: true }
        );
        if (!updated) return sendError(res, 'Factor no encontrado', 404);
        return sendSuccess(res, { message: 'Factor desactivado' });
    } catch (error) {
        return sendError(res, error.message);
    }
};

/**
 * POST /api/pricing-factors/bulk
 * Importación masiva de factores (desde Excel u otro origen)
 * Body: { factors: [ { spk_code, discount_factor, import_factors, margin_factors, ... } ] }
 */
const bulkUpsert = async (req, res) => {
    try {
        const { factors } = req.body;
        if (!Array.isArray(factors) || factors.length === 0) {
            return sendError(res, 'Se requiere un array de factores', 400);
        }

        const operations = factors.map(f => ({
            updateOne: {
                filter: { spk_code: f.spk_code },
                update: { $set: { ...f, is_active: true } },
                upsert: true,
            },
        }));

        const result = await PricingFactor.bulkWrite(operations);

        return sendSuccess(res, {
            message: `Procesados: ${factors.length}`,
            matched: result.matchedCount,
            modified: result.modifiedCount,
            upserted: result.upsertedCount,
        });
    } catch (error) {
        return sendError(res, error.message);
    }
};

module.exports = {
    getPricingFactors,
    getPricingFactor,
    getPricingFactorBySpk,
    createPricingFactor,
    updatePricingFactor,
    deletePricingFactor,
    bulkUpsert,
};