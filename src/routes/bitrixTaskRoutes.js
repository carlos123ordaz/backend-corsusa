const express = require('express');
const router = express.Router();
const { getTasks, getTaskById } = require('../controllers/bitrixTaskController');

// GET /api/bitrix/tasks?pagina=1&tamanoPagina=10&busqueda=123&stageId=485&creadoPor=1
router.get('/', getTasks);

// GET /api/bitrix/tasks/:taskId
router.get('/:taskId', getTaskById);

module.exports = router;