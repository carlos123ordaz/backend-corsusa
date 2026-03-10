const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB para PDFs
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Formato no permitido'));
    },
});

const {
    registrarGasto,
    captureVoucher,
    getGastosByGroupCategoria,
    editGastoById,
    getGastoById,
    getGastosByUser,
    getDashboardStats,
    getGastosByTaskId,
    toggleGastoRevisado, // ✅ Nuevo
    getEstadisticasRevision // ✅ Nuevo
} = require('../controllers/Gasto');

// Estadísticas
router.get('/dashboard-stats', getDashboardStats);
router.get('/task/:taskId/estadisticas-revision', getEstadisticasRevision); // ✅ Nuevo

// Captura y registro
router.post('/capture', upload.single('image'), captureVoucher);
router.post('/', upload.single('imagen'), registrarGasto);

// Actualización y revisión
router.put('/:id', editGastoById);
router.put('/:id/revisar', toggleGastoRevisado); // ✅ Nuevo - Marcar como revisado

// Consultas
router.get('/:id', getGastoById);
router.get('/task/:taskId', getGastosByTaskId);
router.get('/user/:userId', getGastosByUser);
router.get('/task/:taskId/categoria', getGastosByGroupCategoria);

module.exports = router;