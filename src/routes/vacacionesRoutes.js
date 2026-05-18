const { Router } = require('express');
const c               = require('../controllers/vacacionesController');
const authMiddleware  = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

const router = Router();

// Analítica y vistas agregadas
router.get('/dashboard',  c.getDashboard);
router.get('/calendario', c.getCalendario);
router.get('/reportes',   c.getReportes);

// Áreas (catálogo)
router.get('/areas', c.getAreas);

// Feriados (catálogo CRUD)
router.get('/feriados',         c.getFeriados);
router.post('/feriados',        c.createFeriado);
router.delete('/feriados/:iso', c.deleteFeriado);

// Políticas (singleton)
router.get('/politicas', c.getPoliticas);
router.put('/politicas', c.updatePoliticas);

// Seed de datos de prueba (solo desarrollo)
router.post('/seed', c.seedData);

// Migración única: transfiere saldos y referencias de VacEmpleado → User
router.post('/migrate', c.migrateFromVacEmpleado);

// Empleados (leídos directo de User)
router.get('/empleados',               c.getEmpleados);
router.get('/empleados/:id',           c.getEmpleadoById);
router.put('/empleados/:id',           c.updateEmpleado);
router.get('/empleados/:id/historial', c.getEmpleadoHistorial);

// Solicitudes
router.get('/solicitudes',              c.getSolicitudes);
router.post('/solicitudes',             c.createSolicitud);
router.get('/solicitudes/:id',          c.getSolicitudById);
router.put('/solicitudes/:id/aprobar',  c.aprobarSolicitud);
router.put('/solicitudes/:id/rechazar', c.rechazarSolicitud);
router.delete('/solicitudes/:id', authMiddleware, checkPermission('vacaciones.eliminar'), c.deleteSolicitud);

module.exports = router;
