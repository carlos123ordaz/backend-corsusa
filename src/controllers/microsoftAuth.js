// controllers/microsoftAuth.js
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } = require('../config/jwt');
const {
    MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET,
    MICROSOFT_TENANT_ID,
    MICROSOFT_REDIRECT_URI
} = require('../config/microsoft');

// Paso 1: Redirigir al usuario a Microsoft
const microsoftLogin = (req, res) => {
    const returnUrl = req.query.returnUrl || '/';
    const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64');

    const authUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?` +
        `client_id=${MICROSOFT_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}` +
        `&scope=${encodeURIComponent('openid profile email User.Read')}` +
        `&response_mode=query` +
        `&state=${state}`;

    res.redirect(authUrl);
};

// Paso 2: Callback — Microsoft redirige aquí con el code
const microsoftCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        let returnUrl = '/';

        if (state) {
            try {
                const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
                returnUrl = decoded.returnUrl || '/';
            } catch { }
        }

        if (!code) {
            return res.redirect(`/login?error=no_code`);
        }

        // Intercambiar code por tokens de Microsoft
        const tokenResponse = await axios.post(
            `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: MICROSOFT_CLIENT_ID,
                client_secret: MICROSOFT_CLIENT_SECRET,
                code,
                redirect_uri: MICROSOFT_REDIRECT_URI,
                grant_type: 'authorization_code',
                scope: 'openid profile email User.Read',
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token } = tokenResponse.data;

        // Obtener perfil del usuario de Microsoft Graph
        const profileResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const msProfile = profileResponse.data;
        const email = msProfile.mail || msProfile.userPrincipalName;

        // Buscar o crear usuario
        let user = await User.findOne({
            $or: [
                { microsoftId: msProfile.id },
                { email: email }
            ]
        }).populate('areas');

        if (!user) {
            // Crear nuevo usuario (o podrías rechazar si solo quieres usuarios pre-registrados)
            user = await User.create({
                microsoftId: msProfile.id,
                authProvider: 'microsoft',
                name: msProfile.givenName || msProfile.displayName,
                lname: msProfile.surname || '',
                email: email,
                active: true,
            });
        } else {
            // Vincular Microsoft ID si el usuario ya existía con email/password
            if (!user.microsoftId) {
                user.microsoftId = msProfile.id;
                await user.save();
            }
            if (!user.active) {
                return res.redirect(`/login?error=inactive`);
            }
        }

        // Generar tus propios JWT (misma lógica que el login normal)
        const accessToken = jwt.sign(
            { userId: user._id, email: user.email, cargo: user.cargo },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            JWT_REFRESH_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRES_IN }
        );

        // Redirigir al frontend con los tokens
        const frontendUrl = process.env.FRONTEND_URL;
        res.redirect(
            `${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}&returnUrl=${encodeURIComponent(returnUrl)}`
        );

    } catch (error) {
        console.error('Error en Microsoft callback:', error.response?.data || error);
        res.redirect(`/login?error=microsoft_auth_failed`);
    }
};

module.exports = { microsoftLogin, microsoftCallback };