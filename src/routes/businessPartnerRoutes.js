const express = require('express');
const router = express.Router();
const businessPartnerController = require('../controllers/businessPartnerController');

router.get('/', businessPartnerController.getAllBusinessPartners);
router.get('/:id', businessPartnerController.getBusinessPartnerById);
router.post('/', businessPartnerController.createBusinessPartner);
router.put('/:id', businessPartnerController.updateBusinessPartner);
router.delete('/:id', businessPartnerController.deleteBusinessPartner);

module.exports = router;