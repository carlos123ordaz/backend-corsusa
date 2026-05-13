const express = require('express');
const {
    insertAsistencia,
    updateAsistencia,
    getAsistenciasByDate,
    getAsistenciaByUser,
    getAsistenciasByDateRange,
    getAsistenciasStats,
    getAsistenciasAdminByDate
} = require('../controllers/Asistencia');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Registrar entrada o salida
router.post('/', authMiddleware, insertAsistencia);

// Actualizar un registro de asistencia (admin)
router.put('/:id', authMiddleware, updateAsistencia);

// Obtener asistencia de un usuario (hoy)
router.get('/user/:id', getAsistenciaByUser);

// Obtener asistencias por rango de fechas
router.get('/range/dates', getAsistenciasByDateRange);

// Obtener estadísticas de asistencias
router.get('/stats/monthly', getAsistenciasStats);

// Vista admin: todos los usuarios con su estado de asistencia para una fecha
router.get('/admin/date/:fecha', getAsistenciasAdminByDate);

// Obtener asistencias por fecha específica (YYYY-MM-DD) - debe ir al final para no capturar otras rutas
router.get('/:fecha', getAsistenciasByDate);

module.exports = router;