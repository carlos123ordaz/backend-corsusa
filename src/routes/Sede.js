const express = require('express');
const { insertSede, getAllSedes, updateSede, deleteSede } = require('../controllers/Sede');
const router = express.Router();

router.post('/', insertSede);
router.get('/', getAllSedes);
router.put('/:id', updateSede);
router.delete('/:id', deleteSede);

module.exports = router;