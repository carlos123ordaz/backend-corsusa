const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/bitrixUserController');

// GET /api/bitrix/users
router.get('/', getUsers);

module.exports = router;