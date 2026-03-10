// controllers/clientController.js
const Client = require('../models/Client');
const { sendSuccess, sendError, sendPaginated } = require('../helpers/responseHelper');

const getClients = async (req, res) => {
    try {
        const { search, client_type, is_active, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { ruc: { $regex: search, $options: 'i' } },
            ];
        }
        if (client_type) filter.client_type = client_type;
        if (is_active !== undefined) filter.is_active = is_active === 'true';

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(200, Math.max(1, parseInt(limit)));

        const [data, total] = await Promise.all([
            Client.find(filter)
                .sort({ name: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            Client.countDocuments(filter),
        ]);

        // Si no se pide paginación explícita, devolver array directo (para autocomplete)
        if (!req.query.page) {
            return sendSuccess(res, data);
        }

        return sendPaginated(res, { data, total, page: pageNum, limit: limitNum });
    } catch (error) {
        return sendError(res, error.message);
    }
};

const getClient = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id).lean();
        if (!client) return sendError(res, 'Cliente no encontrado', 404);
        return sendSuccess(res, client);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const createClient = async (req, res) => {
    try {
        const client = new Client(req.body);
        await client.save();
        return sendSuccess(res, client, 201);
    } catch (error) {
        if (error.code === 11000) return sendError(res, 'RUC duplicado', 409);
        if (error.name === 'ValidationError') {
            return sendError(res, Object.values(error.errors).map(e => e.message).join(', '), 400);
        }
        return sendError(res, error.message);
    }
};

const updateClient = async (req, res) => {
    try {
        const updated = await Client.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).lean();
        if (!updated) return sendError(res, 'Cliente no encontrado', 404);
        return sendSuccess(res, updated);
    } catch (error) {
        if (error.code === 11000) return sendError(res, 'RUC duplicado', 409);
        return sendError(res, error.message);
    }
};

const deleteClient = async (req, res) => {
    try {
        // Soft delete
        const updated = await Client.findByIdAndUpdate(
            req.params.id,
            { $set: { is_active: false } },
            { new: true }
        );
        if (!updated) return sendError(res, 'Cliente no encontrado', 404);
        return sendSuccess(res, { message: 'Cliente desactivado' });
    } catch (error) {
        return sendError(res, error.message);
    }
};

module.exports = { getClients, getClient, createClient, updateClient, deleteClient };