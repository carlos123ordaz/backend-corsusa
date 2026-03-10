// controllers/imageController.js
const { uploadToGCS, deleteFromGCS } = require('../utils/googleCloud');
const { sendSuccess, sendError } = require('../helpers/responseHelper');

/**
 * POST /api/images/upload
 * Sube una imagen a GCS y devuelve la URL
 */
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return sendError(res, 'No se envió ningún archivo', 400);
        }

        // Validar tipo
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(req.file.mimetype)) {
            return sendError(res, 'Tipo de archivo no permitido. Use JPG, PNG, WEBP o GIF', 400);
        }

        // Validar tamaño (5MB)
        if (req.file.size > 5 * 1024 * 1024) {
            return sendError(res, 'La imagen no debe superar 5MB', 400);
        }

        const url = await uploadToGCS(req.file);

        return sendSuccess(res, {
            url,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
        }, 201);
    } catch (error) {
        console.error('uploadImage error:', error);
        return sendError(res, 'Error al subir imagen: ' + error.message);
    }
};

/**
 * DELETE /api/images
 * Elimina una imagen de GCS por URL
 */
const deleteImage = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return sendError(res, 'URL requerida', 400);
        }

        // Extraer path completo después del bucket name
        const bucketName = process.env.GCS_BUCKET_NAME;
        const prefix = `https://storage.googleapis.com/${bucketName}/`;
        if (!url.startsWith(prefix)) {
            return sendError(res, 'URL no pertenece al bucket configurado', 400);
        }

        const fileName = url.replace(prefix, '');
        const deleted = await deleteFromGCS(fileName);

        if (!deleted) {
            return sendError(res, 'No se pudo eliminar el archivo', 500);
        }

        return sendSuccess(res, { message: 'Imagen eliminada' });
    } catch (error) {
        console.error('deleteImage error:', error);
        return sendError(res, error.message);
    }
};

module.exports = { uploadImage, deleteImage };