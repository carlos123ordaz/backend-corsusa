// routes/serviceBudgetRoutes.js
const { Router } = require('express');
const {
    getServiceBudgets,
    getServiceBudget,
    createServiceBudget,
    updateServiceBudget,
    deleteServiceBudget,
} = require('../controllers/serviceBudgetController');

const router = Router();

router.get('/', getServiceBudgets);
router.post('/', createServiceBudget);
router.get('/:id', getServiceBudget);
router.put('/:id', updateServiceBudget);
router.delete('/:id', deleteServiceBudget);

module.exports = router;