const { getAllSalesInvoices, getSalesInvoiceById, createSalesInvoice, updateSalesInvoice } = require("../controllers/salesInvoiceController");
const express = require('express')
const router = express.Router();

router.get('/', getAllSalesInvoices);
router.get('/:id', getSalesInvoiceById);
router.post('/', createSalesInvoice);
router.put('/:id', updateSalesInvoice);

module.exports = router;