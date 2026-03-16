const axios = require('axios');

const BITRIX_WEBHOOK_URL = process.env.BITRIX_WEBHOOK_URL;

class BitrixUserService {

    /**
     * Obtiene todos los usuarios activos desde Bitrix24.
     * Bitrix devuelve máximo 50 por request, así que paginamos internamente.
     */
    static async getUsers() {
        let allUsers = [];
        let start = 0;

        while (true) {
            const response = await axios.post(`${BITRIX_WEBHOOK_URL}/user.get`, {
                filter: { ACTIVE: true },
                start,
            });

            const users = response.data?.result || [];
            allUsers = allUsers.concat(users);

            const total = response.data?.total || 0;

            if (allUsers.length >= total) break;

            start += 50;
        }

        return allUsers.map(user => ({
            id: String(user.ID),
            name: user.NAME || '',
            lastName: user.LAST_NAME || '',
            active: user.ACTIVE,
        }));
    }
}

module.exports = BitrixUserService;