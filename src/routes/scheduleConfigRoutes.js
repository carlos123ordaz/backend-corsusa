const express = require('express');
const router = express.Router();
const scheduleConfigController = require('../controllers/scheduleConfigController');

// Obtener todas las configuraciones de horarios
router.get('/', scheduleConfigController.getAllScheduleConfigs);

// Obtener configuración de horario por ID
router.get('/:id', scheduleConfigController.getScheduleConfigById);

// Obtener configuración de horario por usuario
router.get('/user/:userId', scheduleConfigController.getScheduleConfigByUser);

// Crear nueva configuración de horario
router.post('/', scheduleConfigController.createScheduleConfig);

// Actualizar configuración de horario
router.put('/:id', scheduleConfigController.updateScheduleConfig);

// Eliminar configuración de horario
router.delete('/:id', scheduleConfigController.deleteScheduleConfig);

// Activar/desactivar configuración de horario
router.patch('/:id/toggle', scheduleConfigController.toggleScheduleConfig);

module.exports = router;