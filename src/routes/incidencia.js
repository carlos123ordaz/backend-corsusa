const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();

const {
    registrarIncidencia,
    getIncidenciasByUser,
    getAllIncidencias,
    getIncidenciaById,
    editIncidenciaById,
    deleteIncidenciaById,
    deleteImageFromIncidencia,
    getIncidenciasAsignadas,
    getIncidenciasAsignadasStats,
    addResolutionImages,
    saveAnnotatedImage,
    getDashboardStats,
    enviarRecordatorio,
    enviarRecordatoriosMasivo,
} = require('../controllers/Incidencia');
const authMiddleware = require('../middleware/auth');

// ─── CRUD ────────────────────────────────────────────────────────────
router.post('/', upload.array('imagenes', 5), authMiddleware, registrarIncidencia);
router.get('/', getAllIncidencias);
router.get('/user/:userId', getIncidenciasByUser);

// ─── Dashboard & Stats ──────────────────────────────────────────────
router.get('/dashboard-stats', getDashboardStats);

// ─── Asignadas ───────────────────────────────────────────────────────
router.get('/asignadas/:userId', getIncidenciasAsignadas);
router.get('/asignadas/:userId/stats', getIncidenciasAsignadasStats);

// ─── Recordatorios ───────────────────────────────────────────────────
router.post('/recordatorios/enviar-masivo', authMiddleware, enviarRecordatoriosMasivo);
router.post('/:id/recordatorio', authMiddleware, enviarRecordatorio);

// ─── Detalle ─────────────────────────────────────────────────────────
router.get('/:id', getIncidenciaById);
router.put('/:id', upload.array('imagenes', 5), authMiddleware, editIncidenciaById);
router.delete('/:id', deleteIncidenciaById);
router.delete('/:id/image', deleteImageFromIncidencia);

// ─── Imágenes especiales ─────────────────────────────────────────────
router.post('/:id/resolution-images', upload.array('files', 10), addResolutionImages);
router.post('/:id/annotated-image', saveAnnotatedImage);

module.exports = router;