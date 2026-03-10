const Gira = require("../models/Gira");
const User = require("../models/User");
const bcrypt = require('bcrypt');

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).populate('areas').lean();
        if (!user) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }
        const girasUsuario = await Gira.find({ user: user._id, active: true });
        return res.status(200).json({ ...user, giras: girasUsuario });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getUsers = async (req, res) => {
    try {
        const { search, active, area, areaId } = req.query;

        // Construir el filtro
        let filter = {};

        // Filtro por búsqueda (nombre, email, DNI)
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { lname: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { dni: { $regex: search, $options: 'i' } }
            ];
        }

        // Filtro por estado activo/inactivo
        if (active !== undefined) {
            filter.active = active === 'true';
        }

        // Filtro por área (ID del área)
        if (area || areaId) {
            filter.areas = area || areaId;
        }

        // Obtener usuarios con áreas pobladas
        const users = await User.find(filter)
            .populate('areas')
            .sort({ _id: -1 })
            .lean();

        return res.status(200).json(users);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const addUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userFound = await User.findOne({ email });
        if (userFound) {
            return res.status(400).json({ error: 'Correo existente' });
        }
        const salt = await bcrypt.genSalt(10);
        const hastPassword = await bcrypt.hash(password, salt);
        const user = new User({ ...req.body, password: hastPassword });
        await user.save();

        // Poblar las áreas antes de devolver
        await user.populate('areas');

        return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const editUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hastPassword = await bcrypt.hash(password, salt);
            req.body.password = hastPassword;
        } else {
            // Si no hay password, lo eliminamos del body para no actualizarlo
            delete req.body.password;
        }

        const userFound = await User.findByIdAndUpdate(id, req.body, { new: true })
            .populate('areas');

        if (!userFound) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }

        return res.status(200).json(userFound);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        return res.status(200).json({ ok: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const savePushToken = async (req, res) => {
    try {
        const { userId, pushToken } = req.body;

        if (!userId || !pushToken) {
            return res.status(400).json({
                error: 'userId y pushToken son requeridos'
            });
        }
        const usuario = await User.findById(userId);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const tokenExists = usuario.pushTokens?.some(t => t.token === pushToken);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    pushTokens: {
                        createdAt: { $lt: thirtyDaysAgo }
                    }
                }
            }
        );
        const updateQuery = {
            pushToken: pushToken,
        };

        if (!tokenExists) {
            updateQuery.$addToSet = {
                pushTokens: {
                    token: pushToken,
                    device: req.headers['user-agent'] || 'unknown',
                    createdAt: new Date()
                }
            };
        }

        const usuarioActualizado = await User.findByIdAndUpdate(
            userId,
            updateQuery,
            { new: true, select: '-password' }
        );
        res.status(200).json({
            ok: 'Token guardado exitosamente',
            usuario: usuarioActualizado
        });
    } catch (error) {
        console.error('Error al guardar token push:', error);
        res.status(500).json({
            error: 'Error al guardar token push',
            details: error.message
        });
    }
};

const removePushToken = async (req, res) => {
    try {
        const { userId, pushToken } = req.body;

        if (!userId || !pushToken) {
            return res.status(400).json({
                error: 'userId y pushToken son requeridos'
            });
        }

        const usuario = await User.findByIdAndUpdate(
            userId,
            {
                $pull: {
                    pushTokens: { token: pushToken }
                },
                $unset: { pushToken: "" }
            },
            { new: true, select: '-password' }
        );

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({
            ok: 'Token eliminado exitosamente',
            usuario
        });
    } catch (error) {
        console.error('Error al eliminar token push:', error);
        res.status(500).json({
            error: 'Error al eliminar token push',
            details: error.message
        });
    }
};

const getUserPushTokens = async (req, res) => {
    try {
        const { userId } = req.params;

        const usuario = await User.findById(userId)
            .select('pushToken pushTokens name lname');

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({
            usuario,
            hasActiveToken: !!usuario.pushToken,
            totalTokens: usuario.pushTokens?.length || 0
        });
    } catch (error) {
        console.error('Error al obtener tokens:', error);
        res.status(500).json({
            error: 'Error al obtener tokens',
            details: error.message
        });
    }
};

module.exports = {
    getUsers,
    getUserById,
    addUser,
    editUser,
    deleteUser,
    savePushToken,
    removePushToken,
    getUserPushTokens
};