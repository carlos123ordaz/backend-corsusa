const express = require('express');
const { insertSede, getAllSedes, updateSede, deleteSede, registerFromDevice } = require('../controllers/Sede');
const router = express.Router();

router.post('/from-device', registerFromDevice);
router.post('/', insertSede);
router.get('/', getAllSedes);
router.put('/:id', updateSede);
router.delete('/:id', deleteSede);

module.exports = router;