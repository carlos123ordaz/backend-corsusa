// controllers/staffController.js
const Staff = require('../models/Staff');
const { sendSuccess, sendError } = require('../helpers/responseHelper');

const getStaff = async (req, res) => {
    try {
        const { search, department, role, is_active } = req.query;
        const filter = {};

        if (search) {
            filter.$or = [
                { full_name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
            ];
        }
        if (department) filter.department = department;
        if (role) filter.roles = role;
        if (is_active !== undefined) filter.is_active = is_active === 'true';

        const data = await Staff.find(filter).sort({ code: 1 }).lean();
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const getStaffById = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id).lean();
        if (!staff) return sendError(res, 'Personal no encontrado', 404);
        return sendSuccess(res, staff);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const createStaff = async (req, res) => {
    try {
        const staff = new Staff(req.body);
        await staff.save();
        return sendSuccess(res, staff, 201);
    } catch (error) {
        if (error.code === 11000) return sendError(res, 'Código de personal duplicado', 409);
        if (error.name === 'ValidationError') {
            return sendError(res, Object.values(error.errors).map(e => e.message).join(', '), 400);
        }
        return sendError(res, error.message);
    }
};

const updateStaff = async (req, res) => {
    try {
        const updated = await Staff.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).lean();
        if (!updated) return sendError(res, 'Personal no encontrado', 404);
        return sendSuccess(res, updated);
    } catch (error) {
        if (error.code === 11000) return sendError(res, 'Código duplicado', 409);
        return sendError(res, error.message);
    }
};

const deleteStaff = async (req, res) => {
    try {
        const updated = await Staff.findByIdAndUpdate(
            req.params.id,
            { $set: { is_active: false } },
            { new: true }
        );
        if (!updated) return sendError(res, 'Personal no encontrado', 404);
        return sendSuccess(res, { message: 'Personal desactivado' });
    } catch (error) {
        return sendError(res, error.message);
    }
};

module.exports = { getStaff, getStaffById, createStaff, updateStaff, deleteStaff };