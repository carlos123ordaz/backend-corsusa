const express = require('express');
const router = express.Router();
const costCenterController = require('../controllers/costCenterController');

// Obtener todos los centros de costo
router.get('/', costCenterController.getAll);

// Obtener jerarquía completa
router.get('/hierarchy', costCenterController.getHierarchy);

// Obtener por nivel (para el primer selector)
router.get('/level/:level', costCenterController.getByLevel);

// Obtener hijos por parent_code (para selectores 2 y 3)
router.get('/parent/:parent_code', costCenterController.getByParentCode);

// Obtener por código específico
router.get('/:code', costCenterController.getByCode);

// Crear nuevo centro de costo
router.post('/', costCenterController.create);

// Actualizar centro de costo
router.put('/:code', costCenterController.update);

// Eliminar centro de costo (soft delete)
router.delete('/:code', costCenterController.delete);

module.exports = router;