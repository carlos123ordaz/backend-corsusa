const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');

// Obtener todas las asignaciones
router.get('/:areaId', assignmentController.getAllAssignments);

// Obtener asignaciones por mes y año
router.get('/month/:month/:year/:areaId', assignmentController.getAssignmentsByMonth);

// Obtener asignaciones por usuario
router.get('/user/:userId', assignmentController.getAssignmentsByUser);

// Obtener asignaciones por rango de fechas
router.post('/range', assignmentController.getAssignmentsByDateRange);

// Crear nueva asignación
router.post('/', assignmentController.createAssignment);

// Actualizar asignación
router.put('/:id', assignmentController.updateAssignment);

// Eliminar asignación
router.delete('/:id', assignmentController.deleteAssignment);

// Eliminar asignaciones por usuario y mes
router.delete('/user/:userId/:month/:year', assignmentController.deleteAssignmentsByUserAndMonth);

module.exports = router;