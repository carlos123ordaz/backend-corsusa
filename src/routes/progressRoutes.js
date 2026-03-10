const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener cursos del usuario
router.get('/my-courses', progressController.getUserCourses);

// Progreso de un curso específico
router.get('/course/:courseId', progressController.getCourseProgress);

// Iniciar un tema
router.post('/course/:courseId/topic/:topicId/start', progressController.startTopic);

// Actualizar posición del video
router.put('/course/:courseId/topic/:topicId/video-position', progressController.updateVideoPosition);

// Responder pregunta intermedia
router.post('/course/:courseId/topic/:topicId/question/:questionId/answer', progressController.answerIntermediateQuestion);

// Completar un tema
router.post('/course/:courseId/topic/:topicId/complete', progressController.completeTopic);

// Examen final
router.get('/course/:courseId/exam', progressController.getExamQuestions);
router.post('/course/:courseId/exam/submit', progressController.submitExam);
router.get('/course/:courseId/exam/attempts', progressController.getExamAttempts);

module.exports = router;