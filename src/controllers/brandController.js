// controllers/brandController.js
const Brand = require('../models/Brand');
const { sendSuccess, sendError } = require('../helpers/responseHelper');

const getBrands = async (req, res) => {
    try {
        const { search, department, is_active } = req.query;
        const filter = {};

        if (search) {
            filter.$or = [
                { code: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { full_name: { $regex: search, $options: 'i' } },
            ];
        }
        if (department) filter.department = department;
        if (is_active !== undefined) filter.is_active = is_active === 'true';

        const data = await Brand.find(filter).sort({ code: 1 }).lean();
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const getBrand = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id).lean();
        if (!brand) return sendError(res, 'Marca no encontrada', 404);
        return sendSuccess(res, brand);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const createBrand = async (req, res) => {
    try {
        const brand = new Brand(req.body);
        await brand.save();
        return sendSuccess(res, brand, 201);
    } catch (error) {
        if (error.code === 11000) return sendError(res, 'Código de marca duplicado', 409);
        if (error.name === 'ValidationError') {
            return sendError(res, Object.values(error.errors).map(e => e.message).join(', '), 400);
        }
        return sendError(res, error.message);
    }
};

const updateBrand = async (req, res) => {
    try {
        const updated = await Brand.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).lean();
        if (!updated) return sendError(res, 'Marca no encontrada', 404);
        return sendSuccess(res, updated);
    } catch (error) {
        if (error.code === 11000) return sendError(res, 'Código duplicado', 409);
        return sendError(res, error.message);
    }
};

const deleteBrand = async (req, res) => {
    try {
        const updated = await Brand.findByIdAndUpdate(
            req.params.id,
            { $set: { is_active: false } },
            { new: true }
        );
        if (!updated) return sendError(res, 'Marca no encontrada', 404);
        return sendSuccess(res, { message: 'Marca desactivada' });
    } catch (error) {
        return sendError(res, error.message);
    }
};

module.exports = { getBrands, getBrand, createBrand, updateBrand, deleteBrand };