const express = require('express');
const {
    getUserById,
    getUsers,
    addUser,
    editUser,
    deleteUser,
    savePushToken,
    removePushToken,
    getUserPushTokens
} = require('../controllers/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/push-token', savePushToken);
router.delete('/push-token', authMiddleware, removePushToken);


router.get('/:userId/push-tokens', authMiddleware, getUserPushTokens);
router.get('/:id', authMiddleware, getUserById);
router.get('/', authMiddleware, getUsers);

// Otras rutas
router.post('/', addUser);
router.put('/:id', editUser);
router.delete('/:id', deleteUser);

module.exports = router;