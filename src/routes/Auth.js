const express = require('express');;
const { login, refreshToken, changePassword } = require('../controllers/auth');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;