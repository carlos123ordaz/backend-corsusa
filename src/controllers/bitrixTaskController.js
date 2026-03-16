const BitrixTaskService = require('../services/bitrixTaskService');

const getTasks = async (req, res) => {
    try {
        const { pagina, tamanoPagina, busqueda, stageId, creadoPor } = req.query;

        const result = await BitrixTaskService.getTasks({
            pagina: pagina ? parseInt(pagina, 10) : 1,
            tamanoPagina: tamanoPagina ? parseInt(tamanoPagina, 10) : 10,
            busqueda: busqueda || undefined,
            stageId: stageId || undefined,
            creadoPor: creadoPor || undefined,
        });

        return res.json(result);
    } catch (error) {
        console.error('Error al obtener tareas de Bitrix:', error.message);
        return res.status(500).json({
            message: 'Error al obtener las tareas desde Bitrix24.',
            error: error.message,
        });
    }
};

const getTaskById = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await BitrixTaskService.getTaskById(taskId);

        if (!task) {
            return res.status(404).json({ message: 'Tarea no encontrada.' });
        }

        return res.json(task);
    } catch (error) {
        console.error('Error al obtener tarea de Bitrix:', error.message);
        return res.status(500).json({
            message: 'Error al obtener la tarea desde Bitrix24.',
            error: error.message,
        });
    }
};

module.exports = { getTasks, getTaskById };