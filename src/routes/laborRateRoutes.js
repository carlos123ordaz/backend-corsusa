// routes/laborRateRoutes.js
const { Router } = require('express');
const {
    getLaborRates,
    getCurrentRate,
    getLaborRate,
    createLaborRate,
    updateLaborRate,
    deleteLaborRate,
} = require('../controllers/laborRateController');

const router = Router();

router.get('/current/:type', getCurrentRate);

router.get('/', getLaborRates);
router.post('/', createLaborRate);
router.get('/:id', getLaborRate);
router.put('/:id', updateLaborRate);
router.delete('/:id', deleteLaborRate);

module.exports = router;