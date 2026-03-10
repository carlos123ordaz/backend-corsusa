// routes/pricingFactorRoutes.js
const { Router } = require('express');
const {
    getPricingFactors,
    getPricingFactor,
    getPricingFactorBySpk,
    createPricingFactor,
    updatePricingFactor,
    deletePricingFactor,
    bulkUpsert,
} = require('../controllers/pricingFactorController');

const router = Router();

// Rutas estáticas antes de parametrizadas
router.get('/by-spk/:spkCode', getPricingFactorBySpk);
router.post('/bulk', bulkUpsert);

router.get('/', getPricingFactors);
router.post('/', createPricingFactor);
router.get('/:id', getPricingFactor);
router.put('/:id', updatePricingFactor);
router.delete('/:id', deletePricingFactor);

module.exports = router;