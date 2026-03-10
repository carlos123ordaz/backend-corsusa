const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');
const authMiddleware = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// CRUD de temas
router.post('/', topicController.createTopic);
router.get('/course/:courseId', topicController.getTopicsByCourse);
router.get('/:id', topicController.getTopicById);
router.put('/:id', topicController.updateTopic);
router.delete('/:id', topicController.deleteTopic);

// Materiales
router.post('/:id/materials', topicController.addMaterialToTopic);
router.delete('/:id/materials/:materialId', topicController.removeMaterialFromTopic);

// Reordenar temas
router.put('/course/:courseId/reorder', topicController.reorderTopics);

module.exports = router;