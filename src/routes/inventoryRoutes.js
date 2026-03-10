const express = require('express');
const { updateInventoryStock, getAllInventory } = require('../controllers/inventoryController');
const router = express.Router();

router.get('/', getAllInventory);
router.post('/update', updateInventoryStock);

module.exports = router;