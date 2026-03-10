const { Storage } = require('@google-cloud/storage');
let credentials;
try {
    credentials = JSON.parse(process.env.GCS_CREDENTIALS);
} catch (error) {
    console.error('Error parseando GCS_CREDENTIALS:', error);
    throw new Error('Credenciales de Google Cloud Storage inválidas');
}

const storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: credentials
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

exports.uploadToGCS = async (file) => {
    return new Promise((resolve, reject) => {
        const { originalname, buffer, mimetype } = file;
        const timestamp = Date.now();
        const fileName = `corsusa/${timestamp}-${originalname.replace(/\s+/g, '-')}`;
        const blob = bucket.file(fileName);

        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: mimetype
            }
        });

        blobStream.on('error', (err) => {
            reject(err);
        });

        blobStream.on('finish', async () => {
            try {
                await blob.makePublic();
            } catch (error) {
                console.warn('No se pudo hacer público el archivo:', error.message);
            }

            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            resolve(publicUrl);
        });
        blobStream.end(buffer);
    });
};

exports.deleteFromGCS = async (fileName) => {
    try {
        await bucket.file(fileName).delete();
        return true;
    } catch (error) {
        console.error('Error eliminando archivo:', error);
        return false;
    }
};

exports.getFileNameFromUrl = (url) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
};