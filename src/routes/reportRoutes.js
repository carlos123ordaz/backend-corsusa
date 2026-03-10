const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Reportes generales
router.get('/general', reportController.getGeneralReport);
router.get('/course/:courseId', reportController.getCourseReport);
router.get('/user/:userId', reportController.getUserReport);
router.get('/overdue', reportController.getOverdueCourses);
router.get('/area/:areaId', reportController.getAreaStats);

// Exportar datos
router.get('/export', reportController.exportReportData);

module.exports = router;