const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

router.get('/', authMiddleware, roleController.getAllRoles);
router.get('/:id', authMiddleware, checkPermission('roles'), roleController.getRoleById);
router.post('/', authMiddleware, checkPermission('roles'), roleController.createRole);
router.put('/:id', authMiddleware, checkPermission('roles'), roleController.updateRole);
router.delete('/:id', authMiddleware, checkPermission('roles'), roleController.deleteRole);

module.exports = router;
