const express = require('express');
const {
    insertAsistencia,
    getAsistenciasByDate,
    getAsistenciaByUser,
    getAsistenciasByDateRange,
    getAsistenciasStats
} = require('../controllers/Asistencia');
const router = express.Router();

// Registrar entrada o salida
router.post('/', insertAsistencia);

// Obtener asistencias por fecha específica (YYYY-MM-DD)
router.get('/:fecha', getAsistenciasByDate);

// Obtener asistencia de un usuario (hoy)
router.get('/user/:id', getAsistenciaByUser);

// Obtener asistencias por rango de fechas
router.get('/range/dates', getAsistenciasByDateRange);

// Obtener estadísticas de asistencias
router.get('/stats/monthly', getAsistenciasStats);

module.exports = router;