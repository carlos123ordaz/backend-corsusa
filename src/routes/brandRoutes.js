// routes/brandRoutes.js
const { Router } = require('express');
const {
    getBrands,
    getBrand,
    createBrand,
    updateBrand,
    deleteBrand,
} = require('../controllers/brandController');

const router = Router();

router.get('/', getBrands);
router.post('/', createBrand);
router.get('/:id', getBrand);
router.put('/:id', updateBrand);
router.delete('/:id', deleteBrand);

module.exports = router;