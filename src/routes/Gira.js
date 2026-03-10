const express = require('express');
const { getGiras, addGira, deleteGira, getGiraById, getGirasByIdUser } = require('../controllers/Gira');
const router = express.Router();

router.get('/', getGiras);
router.get('/:id', getGiraById);
router.get('/user/:userId', getGirasByIdUser);
router.post('/', addGira);
router.delete('/:id', deleteGira);


module.exports = router;