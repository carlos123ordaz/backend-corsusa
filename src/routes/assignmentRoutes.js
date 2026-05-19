const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');

router.get('/month/:month/:year/:areaId', assignmentController.getAssignmentsByMonth);
router.get('/user/:userId', assignmentController.getAssignmentsByUser);
router.get('/:areaId', assignmentController.getAllAssignments);

router.post('/range', assignmentController.getAssignmentsByDateRange);
router.post('/', assignmentController.createAssignment);

router.put('/:id', assignmentController.updateAssignment);

// Bulk delete debe ir ANTES de /:id para no colisionar
router.delete('/bulk', assignmentController.bulkDeleteAssignments);
router.delete('/user/:userId/:month/:year', assignmentController.deleteAssignmentsByUserAndMonth);
router.delete('/:id', assignmentController.deleteAssignment);

module.exports = router;
