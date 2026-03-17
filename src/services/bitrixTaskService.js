const axios = require('axios');

const BITRIX_WEBHOOK_URL = process.env.BITRIX_WEBHOOK_URL;

class BitrixTaskService {

    /**
     * Obtiene datos de usuarios por sus IDs desde Bitrix24.
     */
    static async getUsersByIds(userIds) {
        if (!userIds.length) return {};

        const response = await axios.post(`${BITRIX_WEBHOOK_URL}/user.get`, {
            filter: { ID: userIds },
        });

        const users = response.data?.result || [];
        const usersMap = {};

        users.forEach(user => {
            usersMap[user.ID] = {
                id: user.ID,
                name: `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim(),
            };
        });

        return usersMap;
    }

    /**
     * Obtiene lista de tareas desde Bitrix24 con filtros y paginación.
     */
    static async getTasks({ pagina = 1, tamanoPagina = 50, busqueda, stageId, creadoPor }) {
        const filter = {};
        filter['%TITLE'] = 'Viáticos';
        const select = ['ID', 'TITLE', 'DESCRIPTION', 'STAGE_ID', 'CREATED_BY', 'RESPONSIBLE_ID', 'CREATED_DATE', 'STATUS'];

        if (busqueda) {
            filter['ID'] = busqueda;
        }

        if (stageId) {
            filter['STAGE_ID'] = stageId;
        }

        if (creadoPor) {
            filter['CREATED_BY'] = creadoPor;
        }

        // Bitrix usa start como offset, devuelve hasta 50 por request
        const start = (pagina - 1) * tamanoPagina;

        const response = await axios.post(`${BITRIX_WEBHOOK_URL}/tasks.task.list`, {
            order: { ID: 'desc' },
            filter,
            select,
            start,
        });

        const tasks = response.data?.result?.tasks || [];
        // total viene en la raíz de la respuesta, NO dentro de result
        const total = response.data?.total || 0;

        // Obtener IDs únicos de creadores y responsables
        const userIds = [...new Set([
            ...tasks.map(t => t.createdBy),
            ...tasks.map(t => t.responsibleId),
        ].filter(Boolean))];

        const usersMap = await this.getUsersByIds(userIds);

        return {
            tasks: tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description || '',
                stageId: task.stageId,
                status: task.status,
                createdBy: task.createdBy,
                creator: usersMap[task.createdBy] || { id: task.createdBy, name: 'Desconocido' },
                responsible: usersMap[task.responsibleId] || { id: task.responsibleId, name: 'Desconocido' },
                createdDate: task.createdDate,
            })),
            total,
            page: pagina,
            pageSize: tamanoPagina,
            pages: Math.ceil(total / tamanoPagina),
        };
    }

    /**
     * Obtiene una tarea por su ID.
     */
    static async getTaskById(taskId) {
        const response = await axios.post(`${BITRIX_WEBHOOK_URL}/tasks.task.get`, {
            taskId,
            select: ['ID', 'TITLE', 'DESCRIPTION', 'STAGE_ID', 'CREATED_BY', 'RESPONSIBLE_ID', 'CREATED_DATE', 'STATUS'],
        });

        const task = response.data?.result?.task;

        if (!task) {
            return null;
        }

        const usersMap = await this.getUsersByIds([task.createdBy, task.responsibleId].filter(Boolean));

        return {
            id: task.id,
            title: task.title,
            description: task.description || '',
            stageId: task.stageId,
            status: task.status,
            createdBy: task.createdBy,
            creator: usersMap[task.createdBy] || { id: task.createdBy, name: 'Desconocido' },
            responsible: usersMap[task.responsibleId] || { id: task.responsibleId, name: 'Desconocido' },
            createdDate: task.createdDate,
        };
    }

    // En BitrixTaskService, agregar:

    /**
     * Busca un usuario por email y retorna su ID.
     */
    static async getUserIdByEmail(email) {
        const response = await axios.post(`${BITRIX_WEBHOOK_URL}/user.get`, {
            filter: { EMAIL: email },
        });

        const users = response.data?.result || [];
        return users.length > 0 ? users[0].ID : null;
    }

    /**
     * Obtiene las últimas N tareas de un usuario buscado por email.
     */
    static async getLastTasksByEmail(email, limit = 5) {
        const userId = await this.getUserIdByEmail(email);

        if (!userId) {
            return null; // Usuario no encontrado
        }

        const response = await axios.post(`${BITRIX_WEBHOOK_URL}/tasks.task.list`, {
            order: { ID: 'desc' },
            filter: {
                '%TITLE': 'Viáticos',
                CREATED_BY: userId,
            },
            select: ['ID', 'TITLE', 'DESCRIPTION', 'STAGE_ID', 'CREATED_BY', 'RESPONSIBLE_ID', 'CREATED_DATE', 'STATUS'],
            start: 0,
        });

        const allTasks = response.data?.result?.tasks || [];
        const tasks = allTasks.slice(0, limit);

        const userIds = [...new Set([
            ...tasks.map(t => t.createdBy),
            ...tasks.map(t => t.responsibleId),
        ].filter(Boolean))];

        const usersMap = await this.getUsersByIds(userIds);

        return {
            tasks: tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description || '',
                stageId: task.stageId,
                status: task.status,
                createdBy: task.createdBy,
                creator: usersMap[task.createdBy] || { id: task.createdBy, name: 'Desconocido' },
                responsible: usersMap[task.responsibleId] || { id: task.responsibleId, name: 'Desconocido' },
                createdDate: task.createdDate,
            })),
            total: tasks.length,
        };
    }
}

module.exports = BitrixTaskService;