const BitrixUserService = require('../services/bitrixUserService');

const getUsers = async (req, res) => {
    try {
        const users = await BitrixUserService.getUsers();
        return res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios de Bitrix:', error.message);
        return res.status(500).json({
            message: 'Error al obtener los usuarios desde Bitrix24.',
            error: error.message,
        });
    }
};

module.exports = { getUsers };