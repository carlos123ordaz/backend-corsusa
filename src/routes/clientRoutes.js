// routes/clientRoutes.js
const { Router } = require('express');
const {
    getClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
} = require('../controllers/clientController');

const router = Router();

router.get('/', getClients);
router.post('/', createClient);
router.get('/:id', getClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

module.exports = router;