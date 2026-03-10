// routes/imageRoutes.js
const router = require('express').Router();
const multer = require('multer');
const { uploadImage, deleteImage } = require('../controllers/imageController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/upload', upload.single('image'), uploadImage);
router.delete('/', deleteImage);

module.exports = router;