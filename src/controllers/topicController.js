const Topic = require('../models/Topic');
const Course = require('../models/Course');
const Question = require('../models/Question');
const UserProgress = require('../models/UserProgress');

// Crear un nuevo tema
const createTopic = async (req, res) => {
    try {
        const {
            course_id,
            title,
            description,
            order,
            video,
            materials,
            estimated_duration_minutes
        } = req.body;

        // Validaciones
        if (!course_id || !title || !order || !video || !video.bunny_video_id || !video.bunny_library_id) {
            return res.status(400).json({
                error: 'course_id, title, order y video (bunny_video_id, bunny_library_id) son requeridos'
            });
        }

        // Verificar que el curso existe
        const course = await Course.findById(course_id);
        if (!course) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }

        const topic = new Topic({
            course_id,
            title,
            description,
            order,
            video,
            materials: materials || [],
            estimated_duration_minutes,
            is_active: true
        });

        await topic.save();

        // Actualizar contador de temas en el curso
        await Course.findByIdAndUpdate(course_id, {
            $inc: { total_topics: 1 }
        });

        // Agregar el tema a los UserProgress existentes
        await UserProgress.updateMany(
            { course_id: course_id },
            {
                $push: {
                    topics_progress: {
                        topic_id: topic._id,
                        status: 'not_started',
                        last_video_position_seconds: 0,
                        intermediate_questions_answered: []
                    }
                }
            }
        );

        return res.status(201).json({
            success: true,
            data: topic,
            message: 'Tema creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear tema:', error);
        return res.status(500).json({ error: 'Error al crear tema', details: error.message });
    }
};

// Obtener todos los temas de un curso
const getTopicsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        const topics = await Topic.find({ course_id: courseId, is_active: true })
            .sort({ order: 1 })
            .lean();

        // Para cada tema, obtener las preguntas intermedias
        const topicsWithQuestions = await Promise.all(
            topics.map(async (topic) => {
                const questions = await Question.find({
                    topic_id: topic._id,
                    question_type: 'intermediate',
                    is_active: true
                })
                    .sort({ video_timestamp_seconds: 1 })
                    .lean();

                return {
                    ...topic,
                    intermediate_questions: questions
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: topicsWithQuestions
        });
    } catch (error) {
        console.error('Error al obtener temas:', error);
        return res.status(500).json({ error: 'Error al obtener temas', details: error.message });
    }
};

// Obtener un tema por ID
const getTopicById = async (req, res) => {
    try {
        const { id } = req.params;

        const topic = await Topic.findById(id).lean();

        if (!topic) {
            return res.status(404).json({ error: 'Tema no encontrado' });
        }

        // Obtener preguntas intermedias del tema
        const intermediateQuestions = await Question.find({
            topic_id: id,
            question_type: 'intermediate',
            is_active: true
        })
            .sort({ video_timestamp_seconds: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                ...topic,
                intermediate_questions: intermediateQuestions
            }
        });
    } catch (error) {
        console.error('Error al obtener tema:', error);
        return res.status(500).json({ error: 'Error al obtener tema', details: error.message });
    }
};

// Actualizar un tema
const updateTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // No permitir cambiar el course_id
        delete updateData.course_id;

        const topic = await Topic.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!topic) {
            return res.status(404).json({ error: 'Tema no encontrado' });
        }

        return res.status(200).json({
            success: true,
            data: topic,
            message: 'Tema actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar tema:', error);
        return res.status(500).json({ error: 'Error al actualizar tema', details: error.message });
    }
};

// Eliminar un tema (soft delete)
const deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;

        const topic = await Topic.findByIdAndUpdate(
            id,
            { is_active: false },
            { new: true }
        );

        if (!topic) {
            return res.status(404).json({ error: 'Tema no encontrado' });
        }

        // Actualizar contador de temas en el curso
        await Course.findByIdAndUpdate(topic.course_id, {
            $inc: { total_topics: -1 }
        });

        return res.status(200).json({
            success: true,
            message: 'Tema desactivado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar tema:', error);
        return res.status(500).json({ error: 'Error al eliminar tema', details: error.message });
    }
};

// Agregar material a un tema
const addMaterialToTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, file_type, file_url, file_size_bytes } = req.body;

        if (!title || !file_type || !file_url) {
            return res.status(400).json({
                error: 'title, file_type y file_url son requeridos'
            });
        }

        const topic = await Topic.findByIdAndUpdate(
            id,
            {
                $push: {
                    materials: {
                        title,
                        file_type,
                        file_url,
                        file_size_bytes,
                        uploaded_at: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!topic) {
            return res.status(404).json({ error: 'Tema no encontrado' });
        }

        return res.status(200).json({
            success: true,
            data: topic,
            message: 'Material agregado exitosamente'
        });
    } catch (error) {
        console.error('Error al agregar material:', error);
        return res.status(500).json({ error: 'Error al agregar material', details: error.message });
    }
};

// Eliminar material de un tema
const removeMaterialFromTopic = async (req, res) => {
    try {
        const { id, materialId } = req.params;

        const topic = await Topic.findByIdAndUpdate(
            id,
            {
                $pull: {
                    materials: { _id: materialId }
                }
            },
            { new: true }
        );

        if (!topic) {
            return res.status(404).json({ error: 'Tema no encontrado' });
        }

        return res.status(200).json({
            success: true,
            data: topic,
            message: 'Material eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar material:', error);
        return res.status(500).json({ error: 'Error al eliminar material', details: error.message });
    }
};

// Reordenar temas de un curso
const reorderTopics = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { topic_orders } = req.body; // Array de { topic_id, order }

        if (!Array.isArray(topic_orders)) {
            return res.status(400).json({ error: 'topic_orders debe ser un array' });
        }

        // Actualizar el orden de cada tema
        const updatePromises = topic_orders.map(({ topic_id, order }) =>
            Topic.findByIdAndUpdate(topic_id, { order })
        );

        await Promise.all(updatePromises);

        // Obtener temas actualizados
        const topics = await Topic.find({ course_id: courseId, is_active: true })
            .sort({ order: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: topics,
            message: 'Temas reordenados exitosamente'
        });
    } catch (error) {
        console.error('Error al reordenar temas:', error);
        return res.status(500).json({ error: 'Error al reordenar temas', details: error.message });
    }
};

module.exports = {
    createTopic,
    getTopicsByCourse,
    getTopicById,
    updateTopic,
    deleteTopic,
    addMaterialToTopic,
    removeMaterialFromTopic,
    reorderTopics
};