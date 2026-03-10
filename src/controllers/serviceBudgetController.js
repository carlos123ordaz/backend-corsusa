// controllers/serviceBudgetController.js
const ServiceBudget = require('../models/ServiceBudget');
const { sendSuccess, sendError } = require('../helpers/responseHelper');
const { round } = require('../helpers/pricingHelper');

/**
 * Recalcula el resumen del presupuesto de servicios
 */
const recalcBudgetSummary = (budget) => {
    let total_income = 0;
    let total_expense = 0;
    let total_hours = 0;

    // Sumar ingresos (labor)
    if (budget.labor) {
        for (const [key, val] of Object.entries(budget.labor)) {
            if (val && typeof val === 'object') {
                total_income += val.sale_usd || 0;
                total_hours += val.hours || 0;
            }
        }
    }

    // Sumar egresos (expenses)
    if (budget.expenses) {
        const { logistics, subcontracts, materials, extras } = budget.expenses;

        // Logística
        if (logistics) {
            for (const category of ['travel', 'mobility', 'lodging', 'per_diem']) {
                for (const item of (logistics[category] || [])) {
                    total_expense += item.cost_usd || 0;
                }
            }
        }

        // Subcontratos y materiales
        for (const item of (subcontracts || [])) {
            total_expense += item.cost_usd || 0;
        }
        for (const item of (materials || [])) {
            total_expense += item.cost_usd || 0;
        }

        // Extras
        if (extras) {
            for (const cat of ['administrative', 'operational', 'other']) {
                if (extras[cat]) {
                    total_expense += extras[cat].cost_usd || 0;
                }
            }
        }
    }

    const discount_pct = budget.summary?.discount_percentage || 0;
    const final_sale = round(total_income * (1 - discount_pct / 100));
    const profit = round(final_sale - total_expense);
    const profit_pct = final_sale > 0 ? round((profit / final_sale) * 100, 2) : 0;

    budget.summary = {
        total_income_usd: round(total_income),
        total_expense_usd: round(total_expense),
        discount_percentage: discount_pct,
        final_sale_price_usd: final_sale,
        profit_usd: profit,
        profit_percentage: profit_pct,
        total_instruments: budget.summary?.total_instruments || 0,
        service_days: budget.summary?.service_days || 0,
        total_hours: round(total_hours),
    };

    return budget;
};

/**
 * GET /api/service-budgets?quotation_id=xxx
 * Lista presupuestos de una cotización
 */
const getServiceBudgets = async (req, res) => {
    try {
        const { quotation_id } = req.query;
        if (!quotation_id) return sendError(res, 'Se requiere quotation_id', 400);

        const data = await ServiceBudget.find({ quotation_id })
            .sort({ annex_number: 1 })
            .lean();

        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const getServiceBudget = async (req, res) => {
    try {
        const budget = await ServiceBudget.findById(req.params.id)
            .populate('quotation_id', 'reference full_reference client_name')
            .lean();

        if (!budget) return sendError(res, 'Presupuesto no encontrado', 404);
        return sendSuccess(res, budget);
    } catch (error) {
        return sendError(res, error.message);
    }
};

const createServiceBudget = async (req, res) => {
    try {
        let data = { ...req.body };
        data = recalcBudgetSummary(data);

        const budget = new ServiceBudget(data);
        await budget.save();
        return sendSuccess(res, budget, 201);
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 'Ya existe un anexo con ese número para esta cotización', 409);
        }
        if (error.name === 'ValidationError') {
            return sendError(res, Object.values(error.errors).map(e => e.message).join(', '), 400);
        }
        return sendError(res, error.message);
    }
};

const updateServiceBudget = async (req, res) => {
    try {
        let data = { ...req.body };

        // Recalcular si vienen datos de labor o expenses
        if (data.labor || data.expenses) {
            const existing = await ServiceBudget.findById(req.params.id).lean();
            if (!existing) return sendError(res, 'Presupuesto no encontrado', 404);

            const merged = {
                ...existing,
                ...data,
                labor: data.labor || existing.labor,
                expenses: data.expenses || existing.expenses,
                summary: { ...(existing.summary || {}), ...(data.summary || {}) },
            };
            data = recalcBudgetSummary(merged);
        }

        const updated = await ServiceBudget.findByIdAndUpdate(
            req.params.id,
            { $set: data },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) return sendError(res, 'Presupuesto no encontrado', 404);
        return sendSuccess(res, updated);
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 'Número de anexo duplicado para esta cotización', 409);
        }
        return sendError(res, error.message);
    }
};

const deleteServiceBudget = async (req, res) => {
    try {
        const deleted = await ServiceBudget.findByIdAndDelete(req.params.id);
        if (!deleted) return sendError(res, 'Presupuesto no encontrado', 404);
        return sendSuccess(res, { message: 'Presupuesto eliminado' });
    } catch (error) {
        return sendError(res, error.message);
    }
};

module.exports = {
    getServiceBudgets,
    getServiceBudget,
    createServiceBudget,
    updateServiceBudget,
    deleteServiceBudget,
};