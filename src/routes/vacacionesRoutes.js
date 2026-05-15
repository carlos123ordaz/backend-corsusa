const { Router } = require('express');
const c = require('../controllers/vacacionesController');

const router = Router();

// Analítica y vistas agregadas
router.get('/dashboard',  c.getDashboard);
router.get('/calendario', c.getCalendario);
router.get('/reportes',   c.getReportes);

// Áreas (catálogo)
router.get('/areas', c.getAreas);

// Feriados (catálogo CRUD)
router.get('/feriados',        c.getFeriados);
router.post('/feriados',       c.createFeriado);
router.delete('/feriados/:iso', c.deleteFeriado);

// Políticas (singleton)
router.get('/politicas', c.getPoliticas);
router.put('/politicas', c.updatePoliticas);

// Seed de datos iniciales (solo desarrollo)
router.post('/seed', c.seedData);

// Sincronizar empleados desde Users del sistema
router.post('/sync-usuarios', c.syncFromUsers);

// Empleados
router.get('/empleados',               c.getEmpleados);
router.post('/empleados',              c.createEmpleado);
router.get('/empleados/:id',           c.getEmpleadoById);
router.put('/empleados/:id',           c.updateEmpleado);
router.get('/empleados/:id/historial', c.getEmpleadoHistorial);

// Solicitudes
router.get('/solicitudes',              c.getSolicitudes);
router.post('/solicitudes',             c.createSolicitud);
router.get('/solicitudes/:id',          c.getSolicitudById);
router.put('/solicitudes/:id/aprobar',  c.aprobarSolicitud);
router.put('/solicitudes/:id/rechazar', c.rechazarSolicitud);

module.exports = router;
