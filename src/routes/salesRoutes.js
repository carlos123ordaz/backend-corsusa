const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
router.get('/', salesController.getAllSales);
router.get('/:id', salesController.getSaleById);
router.post('/', salesController.createSale);
router.put('/:id', salesController.updateSale);
router.delete('/:id', salesController.deleteSale);
router.get('/by-opci/:correlativo_opci/items', salesController.getSaleItemsByOPCI);
router.post('/:id/items', salesController.addSaleItem);
router.put('/:saleId/items/:itemId', salesController.updateSaleItem);
router.delete('/:saleId/items/:itemId', salesController.deleteSaleItem);

module.exports = router;
