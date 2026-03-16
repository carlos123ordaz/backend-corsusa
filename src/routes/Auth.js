const express = require('express');;
const { login, refreshToken, changePassword } = require('../controllers/auth');
const authMiddleware = require('../middleware/auth');
const { microsoftLogin, microsoftCallback } = require('../controllers/microsoftAuth');
const router = express.Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/change-password', authMiddleware, changePassword);

router.get('/microsoft/login', microsoftLogin);
router.get('/microsoft-callback', microsoftCallback);

module.exports = router;