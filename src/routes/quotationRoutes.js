// routes/quotationRoutes.js
const { Router } = require('express');
const {
    getQuotations,
    getQuotation,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    createRevision,
    generateReference,
    recalculateQuotation,
} = require('../controllers/quotationController');

const router = Router();

// ⚠️ Rutas estáticas ANTES de las parametrizadas
router.get('/generate-reference', generateReference);

router.get('/', getQuotations);
router.post('/', createQuotation);

router.get('/:id', getQuotation);
router.put('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);

router.post('/:id/revision', createRevision);
router.post('/:id/recalculate', recalculateQuotation);

module.exports = router;