
const quotationRoutes = require('./quotationRoutes');
const clientRoutes = require('./clientRoutes');
const staffRoutes = require('./staffRoutes');
const brandRoutes = require('./brandRoutes');
const pricingFactorRoutes = require('./pricingFactorRoutes');
const configRoutes = require('./configRoutes');
const laborRateRoutes = require('./laborRateRoutes');
const serviceBudgetRoutes = require('./serviceBudgetRoutes');

/**
 * Registra todas las rutas del módulo de cotizaciones
 * @param {import('express').Application} app - Instancia de Express
 * @param {string} prefix - Prefijo base (default: '/api')
 */
const registerQuotationRoutes = (app, prefix = '/api') => {
    app.use(`${prefix}/quotations`, quotationRoutes);
    app.use(`${prefix}/clients`, clientRoutes);
    app.use(`${prefix}/staff`, staffRoutes);
    app.use(`${prefix}/brands`, brandRoutes);
    app.use(`${prefix}/pricing-factors`, pricingFactorRoutes);
    app.use(`${prefix}/config`, configRoutes);
    app.use(`${prefix}/labor-rates`, laborRateRoutes);
    app.use(`${prefix}/service-budgets`, serviceBudgetRoutes);
};

module.exports = { registerQuotationRoutes };
