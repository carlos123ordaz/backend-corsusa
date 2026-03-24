const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        // MIME types correctos para Excel
        const allowed = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];

        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Formato no permitido: ${file.mimetype}`));
        }
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
    toggleGastoRevisado,
    getEstadisticasRevision,
    eliminarGasto,
    importGastosFromExcel
} = require('../controllers/Gasto');
const { voiceToExpense } = require('../controllers/voiceExpenseController');

// Estadísticas
router.get('/dashboard-stats', getDashboardStats);
router.get('/task/:taskId/estadisticas-revision', getEstadisticasRevision); // ✅ Nuevo

// Captura y registro
router.post('/capture', upload.single('image'), captureVoucher);
router.post('/', upload.single('imagen'), registrarGasto);

// Actualización y revisión
router.put('/:id', editGastoById);
router.put('/:id/revisar', toggleGastoRevisado);

// Eliminación
router.delete('/:id', eliminarGasto);

// Consultas
router.get('/:id', getGastoById);
router.get('/task/:taskId', getGastosByTaskId);
router.get('/user/:userId', getGastosByUser);
router.get('/task/:taskId/categoria', getGastosByGroupCategoria);
router.post('/voice-to-expense', voiceToExpense);
router.post('/import/:taskId', upload.single('file'), importGastosFromExcel);

module.exports = router;