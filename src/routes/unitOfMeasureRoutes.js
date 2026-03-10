const express = require('express');
const { getAllUnitsOfMeasure, createUnitOfMeasure } = require('../controllers/unitOfMeasureController');
const router = express.Router();

router.get('/', getAllUnitsOfMeasure);
router.post('/', createUnitOfMeasure);

module.exports = router;