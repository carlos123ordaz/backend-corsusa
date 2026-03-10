// controllers/configController.js
const Config = require('../models/Config');
const { sendSuccess, sendError } = require('../helpers/responseHelper');

/**
 * GET /api/config/dropdown-options
 * Devuelve todas las opciones de dropdowns para el frontend
 */
const getDropdownOptions = async (req, res) => {
    try {
        let config = await Config.findOne({ type: 'dropdown_options' }).lean();

        // Si no existe, crear con valores por defecto
        if (!config) {
            config = await Config.create({
                type: 'dropdown_options',
                purchase_currencies: ['EUR', 'US$'],
                offer_types: ['Local $', 'Local S/.', 'FCA'],
                client_types: [
                    { code: '01', label: '01 Cliente Final', discount: 0 },
                    { code: '02', label: '02 Pyme', discount: 5 },
                    { code: '03', label: '03 Partner', discount: 10 },
                    { code: '04', label: '04 Canal', discount: 15 },
                    { code: '05', label: '05 Competencia', discount: 0 },
                ],
                offer_categories: ['Técnico-Comercial', 'Técnica', 'Servicio'],
                payment_terms: [
                    '100% adelantado',
                    '50% adelantado, 50% contra entrega',
                    'Crédito 30 días',
                    'Crédito 60 días',
                    'Crédito 90 días',
                    'Cheque diferido a 15 días',
                    'Cheque diferido a 30 días',
                ],
                delivery_times: [
                    '01 a 02 semanas',
                    '02 a 04 semanas',
                    '04 a 06 semanas',
                    '06 a 08 semanas',
                    '08 a 12 semanas',
                    '12 a 16 semanas',
                    '16 a 20 semanas',
                ],
                delivery_places: [
                    'En almacenes de Corsusa International S.A.C.',
                    'En su almacén de Lima Metropolitana / Callao',
                    'En obra / planta del cliente',
                    'Transportista que Indiquen',
                ],
                item_validations: ['OK', 'ALT.', 'Comprado'],
                item_statuses: ['Necesario', 'Opcional', 'Alternativa'],
                quotation_statuses: ['Preparado', 'Responsable', 'Selección', 'Data Sheets', 'Aprobado C', 'Servicios', 'Manager'],
                departments: ['UN AU', 'UN AI', 'UN VA', 'Servicios', 'Proyectos', 'HSEQ', 'Otros'],
                global_import_factors: {
                    air_freight_dhl: 1.40,
                    air_freight_consolidated: 1.18,
                    customs_agent_dhl: 0.015,
                    customs_agent_consolidated: 0.015,
                    customs_dhl: 0.04,
                    customs_consolidated: 0.04,
                    margin_dhl: 1.52,
                    margin_consolidated: 1.52,
                    margin_resale: 1.50,
                    eur_to_usd: 1.08,
                    usd_to_pen: 3.72,
                },
            });
        }

        return sendSuccess(res, config);
    } catch (error) {
        return sendError(res, error.message);
    }
};

/**
 * PUT /api/config/dropdown-options
 * Actualiza las opciones de dropdowns
 */
const updateDropdownOptions = async (req, res) => {
    try {
        const updated = await Config.findOneAndUpdate(
            { type: 'dropdown_options' },
            { $set: req.body },
            { new: true, upsert: true, runValidators: true }
        ).lean();

        return sendSuccess(res, updated);
    } catch (error) {
        return sendError(res, error.message);
    }
};

/**
 * GET /api/config/global-settings
 * Devuelve los factores globales de importación y tipos de cambio
 */
const getGlobalSettings = async (req, res) => {
    try {
        const config = await Config.findOne(
            { type: 'dropdown_options' },
            { global_import_factors: 1, shipping_dimensions: 1 }
        ).lean();

        if (!config) return sendError(res, 'Configuración no encontrada', 404);
        return sendSuccess(res, config);
    } catch (error) {
        return sendError(res, error.message);
    }
};

/**
 * PUT /api/config/global-settings
 * Actualiza factores globales y tipos de cambio
 */
const updateGlobalSettings = async (req, res) => {
    try {
        const updates = {};
        if (req.body.global_import_factors) {
            updates.global_import_factors = req.body.global_import_factors;
        }
        if (req.body.shipping_dimensions) {
            updates.shipping_dimensions = req.body.shipping_dimensions;
        }

        const updated = await Config.findOneAndUpdate(
            { type: 'dropdown_options' },
            { $set: updates },
            { new: true }
        ).lean();

        if (!updated) return sendError(res, 'Configuración no encontrada', 404);
        return sendSuccess(res, updated);
    } catch (error) {
        return sendError(res, error.message);
    }
};

module.exports = {
    getDropdownOptions,
    updateDropdownOptions,
    getGlobalSettings,
    updateGlobalSettings,
};