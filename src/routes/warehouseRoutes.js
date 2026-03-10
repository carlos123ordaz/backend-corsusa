const express = require('express');
const { updateWarehouse, createWarehouse, getAllWarehouses } = require('../controllers/warehouseController');
const router = express.Router();

router.get('/', getAllWarehouses);
router.post('/', createWarehouse);
router.put('/:id', updateWarehouse);

module.exports = router;