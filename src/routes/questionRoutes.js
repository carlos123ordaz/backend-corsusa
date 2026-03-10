const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const authMiddleware = require('../middleware/auth');
// Todas las rutas requieren autenticación
router.use(authMiddleware);

// CRUD de preguntas
router.post('/', questionController.createQuestion);
router.post('/bulk', questionController.createQuestionsInBulk);
router.get('/course/:courseId', questionController.getQuestionsByCourse);
router.get('/:id', questionController.getQuestionById);
router.put('/:id', questionController.updateQuestion);
router.delete('/:id', questionController.deleteQuestion);

// Reordenar preguntas de examen final
router.put('/course/:courseId/exam/reorder', questionController.reorderExamQuestions);

module.exports = router;