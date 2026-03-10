const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
router.get('/', purchaseController.getAllPurchases);
router.get('/:id', purchaseController.getPurchaseById);
router.post('/', purchaseController.createPurchase);
router.put('/:id', purchaseController.updatePurchase);
router.delete('/:id', purchaseController.deletePurchase);
router.patch('/:id/status', purchaseController.changePurchaseStatus);
router.post('/:id/add-from-sale', purchaseController.addItemsFromSale);
router.put('/:purchaseId/items/:itemId', purchaseController.updatePurchaseItem);
router.delete('/:purchaseId/items/:itemId', purchaseController.deletePurchaseItem);

module.exports = router;