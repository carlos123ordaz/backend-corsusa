const express = require('express');
const router = express.Router();
const { getAllWarehouseMovements, createWarehouseMovement, updateWarehouseMovement } = require('../controllers/warehouseMovementController');


router.get('/', getAllWarehouseMovements);
router.post('/', createWarehouseMovement);
router.put('/:id', updateWarehouseMovement);

module.exports = router;