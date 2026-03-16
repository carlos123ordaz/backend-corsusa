// config/microsoft.js
module.exports = {
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
    MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID || 'common',
    MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI,
    // ej: http://localhost:3000/api/auth/microsoft/callback
};