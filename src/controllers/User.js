const Gira = require("../models/Gira");
const User = require("../models/User");
const bcrypt = require('bcrypt');
const axios = require('axios');

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).populate('areas').populate('role').populate('sede').lean();
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
        const { search, active, area, areaId, page, limit } = req.query;

        let filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { lname: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { dni: { $regex: search, $options: 'i' } }
            ];
        }

        if (active !== undefined) {
            filter.active = active === 'true';
        }

        if (area || areaId) {
            filter.areas = area || areaId;
        }

        const isPaginated = page !== undefined;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 15));
        const skip = (pageNum - 1) * limitNum;

        let query = User.find(filter)
            .populate('areas')
            .populate('role')
            .populate('sede')
            .sort({ _id: -1 });

        if (isPaginated) {
            query = query.skip(skip).limit(limitNum);
        }

        const [users, total] = await Promise.all([
            query.lean(),
            User.countDocuments(filter),
        ]);

        const data = users.map(u => ({
            ...u,
            hasEmbedding: Array.isArray(u.embedding) && u.embedding.length > 0,
        }));

        return res.status(200).json({ data, total });
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
        await user.populate('role');
        await user.populate('sede');

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
            .populate('areas')
            .populate('role')
            .populate('sede');

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

const soloNumeros = (str) => (str ? String(str).replace(/\D/g, '') : '');

const syncFromBitrix = async (req, res) => {
    try {
        const webhookBase = process.env.BITRIX_WEBHOOK_URL;
        if (!webhookBase) {
            return res.status(500).json({ error: 'BITRIX_WEBHOOK_URL no configurado' });
        }

        // Traer usuarios de Bitrix en dos llamadas separadas con valores válidos 'Y'/'N'
        const fetchPages = async (active) => {
            const users = [];
            let start = 0;
            while (true) {
                const { data } = await axios.get(`${webhookBase}/user.get`, {
                    params: { start, ACTIVE: active },
                });
                users.push(...data.result);
                if (data.next !== undefined) start = data.next;
                else break;
            }
            return users;
        };

        const [activeBitrixUsers, inactiveBitrixUsers] = await Promise.all([
            fetchPages('Y'),
            fetchPages('N'),
        ]);

        // Traer usuarios existentes en DB con campos necesarios para import y desactivación
        const existing = await User.find({}, { dni: 1, email: 1, active: 1, name: 1, lname: 1 }).lean();

        const existingByDni = new Map(existing.filter((u) => u.dni).map((u) => [u.dni, u]));
        const existingByEmail = new Map(existing.filter((u) => u.email).map((u) => [u.email, u]));
        const existingDnis = new Set(existing.map((u) => u.dni).filter(Boolean));
        const existingEmails = new Set(existing.map((u) => u.email).filter(Boolean));

        // ── Importar usuarios nuevos (solo los activos en Bitrix) ────────────
        const salt = await bcrypt.genSalt(10);
        const toInsert = [];
        const skipped = [];

        for (const u of activeBitrixUsers) {
            const dni = soloNumeros(u.UF_USR_1583783785065);
            const email = u.EMAIL || '';

            if (existingDnis.has(dni) || existingEmails.has(email)) {
                skipped.push({ name: `${u.NAME} ${u.LAST_NAME}`, reason: 'ya existe' });
                continue;
            }
            if (!email) {
                skipped.push({ name: `${u.NAME} ${u.LAST_NAME}`, reason: 'sin correo' });
                continue;
            }

            const password = dni
                ? await bcrypt.hash(dni, salt)
                : await bcrypt.hash('corsusa123', salt);

            toInsert.push({
                name: u.NAME || '',
                lname: u.LAST_NAME || '',
                email,
                dni: dni || undefined,
                position: u.WORK_POSITION || undefined,
                phone: u.PERSONAL_MOBILE || u.PERSONAL_PHONE || undefined,
                active: !!u.ACTIVE && u.ACTIVE !== 'N',
                password,
            });

            // Registrar para no insertar duplicados dentro del mismo batch
            if (dni) existingDnis.add(dni);
            existingEmails.add(email);
        }

        let insertedCount = 0;
        if (toInsert.length > 0) {
            // Usamos la colección raw para evitar que Mongoose aplique default: null
            // en microsoftId (campo con índice único sparse), lo que causaría conflictos
            // al insertar múltiples documentos con null simultáneamente.
            const now = new Date();
            const rawDocs = toInsert.map((u) => ({
                ...u,
                areas: [],
                pushTokens: [],
                authProvider: 'local',
                createdAt: now,
                updatedAt: now,
            }));
            const result = await User.collection.insertMany(rawDocs, { ordered: false });
            insertedCount = result.insertedCount;
        }

        // ── Desactivar usuarios inactivos en Bitrix que están activos en DB ──
        const idsToDeactivate = [];
        const deactivatedDetail = [];

        for (const u of inactiveBitrixUsers) {
            const dni = soloNumeros(u.UF_USR_1583783785065);
            const email = u.EMAIL || '';

            const dbUser = (dni && existingByDni.get(dni)) || (email && existingByEmail.get(email));
            if (dbUser && dbUser.active) {
                idsToDeactivate.push(dbUser._id);
                deactivatedDetail.push({ name: `${u.NAME} ${u.LAST_NAME}` });
            }
        }

        let deactivatedCount = 0;
        if (idsToDeactivate.length > 0) {
            const updateResult = await User.updateMany(
                { _id: { $in: idsToDeactivate } },
                { active: false }
            );
            deactivatedCount = updateResult.modifiedCount;
        }

        return res.status(200).json({
            total_bitrix: activeBitrixUsers.length + inactiveBitrixUsers.length,
            imported: insertedCount,
            skipped: skipped.length,
            skipped_detail: skipped,
            deactivated: deactivatedCount,
            deactivated_detail: deactivatedDetail,
        });
    } catch (error) {
        console.error('Error al sincronizar con Bitrix:', error);
        return res.status(500).json({ error: 'Error al sincronizar con Bitrix', detail: error.message });
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
    getUserPushTokens,
    syncFromBitrix,
};
