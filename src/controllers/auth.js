const User = require("../models/User");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } = require('../config/jwt');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send({ error: 'email y contraseña son requeridos' });
        }
        const userFound = await User.findOne({ email }).select('+password').populate('areas');
        if (!userFound) {
            return res.status(401).send({ error: 'El email o la contraseña no son correctos' });
        }
        if (!userFound.active) {
            return res.status(403).send({ error: 'Usuario inactivo' });
        }
        const isMatch = await bcrypt.compare(password, userFound.password);
        if (!isMatch) {
            return res.status(401).send({ error: 'El email o la contraseña no son correctos' });
        }

        const accessToken = jwt.sign(
            {
                userId: userFound._id,
                email: userFound.email,
                cargo: userFound.cargo
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { userId: userFound._id },
            JWT_REFRESH_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRES_IN }
        );
        const user = {
            _id: userFound._id,
            name: userFound.name,
            lname: userFound.lname,
            email: userFound.email,
            position: userFound.position,
            areas: userFound.areas,
            photo: userFound.photo,
            sede: userFound.sede,
            phone: userFound.phone,
            dni: userFound.dni,
        };

        return res.status(200).json({
            accessToken,
            refreshToken,
            user
        });

    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).send({ error: 'Error en el servidor' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).send({ error: 'Refresh token requerido' });
        }
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || !user.active) {
            return res.status(401).send({ error: 'Usuario no válido' });
        }
        const newAccessToken = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                cargo: user.cargo
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            accessToken: newAccessToken
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ error: 'Token inválido' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).send({ error: 'Refresh token expirado' });
        }
        console.error('Error en refresh token:', error);
        return res.status(500).send({ error: 'Error en el servidor' });
    }
};
const changePassword = async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Todos los campos son requeridos'
            });
        }

        // Validar longitud mínima de nueva contraseña
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        // Buscar usuario con password
        const user = await User.findById(userId).select('+password');

        if (user.authProvider === 'microsoft') {
            return res.status(400).json({
                error: 'Los usuarios con Microsoft no pueden cambiar la contraseña aquí'
            });
        }

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar contraseña actual
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(401).json({
                error: 'La contraseña actual es incorrecta'
            });
        }

        // Hashear nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Actualizar contraseña
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({
            ok: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        return res.status(500).json({ error: 'Error en el servidor' });
    }
};


module.exports = {
    login,
    refreshToken,
    changePassword
};