const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
require('dotenv')
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = 'gastos-imagenes';

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

const uploadImageToBlob = async (file) => {
    try {
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        await containerClient.createIfNotExists({
            access: 'blob'
        });
        const fileExtension = file.originalname.split('.').pop();
        const blobName = `${uuidv4()}.${fileExtension}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: {
                blobContentType: file.mimetype
            }
        });
        return blockBlobClient.url;
    } catch (error) {
        console.error('Error al subir imagen a Azure Blob Storage:', error);
        throw error;
    }
};

const deleteImageFromBlob = async (imageUrl) => {
    try {
        const blobName = imageUrl.split('/').pop();
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.deleteIfExists();
        return true;
    } catch (error) {
        console.error('Error al eliminar imagen de Azure Blob Storage:', error);
        throw error;
    }
};

module.exports = {
    uploadImageToBlob,
    deleteImageFromBlob
};