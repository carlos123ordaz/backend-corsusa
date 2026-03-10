// controllers/businessPartnerController.js
const BusinessPartner = require('../models/BusinessPartner');

/**
 * Obtener todos los business partners
 * GET /api/business-partners
 */
exports.getAllBusinessPartners = async (req, res) => {
    try {
        const { page = 1, limit = 20, roles, estado, razon_social } = req.query;
        const filter = {};
        if (roles) filter.roles = { $in: roles.split(',') };
        if (estado) filter.estado = estado;
        if (razon_social) filter.razon_social = new RegExp(razon_social, 'i');

        const partners = await BusinessPartner.find(filter)
            .sort({ razon_social: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await BusinessPartner.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: partners,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Error en getAllBusinessPartners:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los business partners',
            error: error.message
        });
    }
};

/**
 * Obtener un business partner por ID
 * GET /api/business-partners/:id
 */
exports.getBusinessPartnerById = async (req, res) => {
    try {
        const { id } = req.params;

        const partner = await BusinessPartner.findById(id).lean();

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Business partner no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: partner
        });
    } catch (error) {
        console.error('Error en getBusinessPartnerById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el business partner',
            error: error.message
        });
    }
};

/**
 * Crear un nuevo business partner
 * POST /api/business-partners
 */
exports.createBusinessPartner = async (req, res) => {
    try {
        const partnerData = req.body;

        const newPartner = new BusinessPartner(partnerData);
        await newPartner.save();

        res.status(201).json({
            success: true,
            message: 'Business partner creado exitosamente',
            data: newPartner
        });
    } catch (error) {
        console.error('Error en createBusinessPartner:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el business partner',
            error: error.message
        });
    }
};

/**
 * Actualizar un business partner
 * PUT /api/business-partners/:id
 */
exports.updateBusinessPartner = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedPartner = await BusinessPartner.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedPartner) {
            return res.status(404).json({
                success: false,
                message: 'Business partner no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Business partner actualizado exitosamente',
            data: updatedPartner
        });
    } catch (error) {
        console.error('Error en updateBusinessPartner:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el business partner',
            error: error.message
        });
    }
};

/**
 * Eliminar un business partner
 * DELETE /api/business-partners/:id
 */
exports.deleteBusinessPartner = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedPartner = await BusinessPartner.findByIdAndDelete(id);

        if (!deletedPartner) {
            return res.status(404).json({
                success: false,
                message: 'Business partner no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Business partner eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error en deleteBusinessPartner:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el business partner',
            error: error.message
        });
    }
};