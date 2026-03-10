const Question = require('../models/Question');
const Course = require('../models/Course');
const Topic = require('../models/Topic');

// Crear una pregunta
const createQuestion = async (req, res) => {
    try {
        const {
            course_id,
            topic_id,
            question_type,
            question_text,
            options,
            is_multiple_choice,
            video_timestamp_seconds,
            explanation,
            order,
            points
        } = req.body;

        // Validaciones
        if (!course_id || !question_type || !question_text || !options) {
            return res.status(400).json({
                error: 'course_id, question_type, question_text y options son requeridos'
            });
        }

        // Verificar que el curso existe
        const course = await Course.findById(course_id);
        if (!course) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }

        // Validar según el tipo de pregunta
        if (question_type === 'intermediate') {
            if (!topic_id) {
                return res.status(400).json({
                    error: 'topic_id es requerido para preguntas intermedias'
                });
            }
            if (video_timestamp_seconds === undefined || video_timestamp_seconds === null) {
                return res.status(400).json({
                    error: 'video_timestamp_seconds es requerido para preguntas intermedias'
                });
            }

            // Verificar que el tema existe
            const topic = await Topic.findById(topic_id);
            if (!topic) {
                return res.status(404).json({ error: 'Tema no encontrado' });
            }
        }

        const question = new Question({
            course_id,
            topic_id: topic_id || null,
            question_type,
            question_text,
            options,
            is_multiple_choice: is_multiple_choice || false,
            video_timestamp_seconds: video_timestamp_seconds || null,
            explanation,
            order,
            points: points || 1,
            is_active: true,
            created_by: req.user.userId
        });

        await question.save();

        return res.status(201).json({
            success: true,
            data: question,
            message: 'Pregunta creada exitosamente'
        });
    } catch (error) {
        console.error('Error al crear pregunta:', error);
        return res.status(500).json({ error: 'Error al crear pregunta', details: error.message });
    }
};

// Obtener preguntas de un curso (filtradas por tipo)
const getQuestionsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { question_type, topic_id } = req.query;

        const filter = {
            course_id: courseId,
            is_active: true
        };

        if (question_type) {
            filter.question_type = question_type;
        }

        if (topic_id) {
            filter.topic_id = topic_id;
        }

        const questions = await Question.find(filter)
            .populate('topic_id', 'title order')
            .sort({ order: 1, video_timestamp_seconds: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: questions
        });
    } catch (error) {
        console.error('Error al obtener preguntas:', error);
        return res.status(500).json({ error: 'Error al obtener preguntas', details: error.message });
    }
};

// Obtener una pregunta por ID
const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;

        const question = await Question.findById(id)
            .populate('topic_id', 'title order')
            .lean();

        if (!question) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }

        return res.status(200).json({
            success: true,
            data: question
        });
    } catch (error) {
        console.error('Error al obtener pregunta:', error);
        return res.status(500).json({ error: 'Error al obtener pregunta', details: error.message });
    }
};

// Actualizar una pregunta
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // No permitir cambiar estos campos
        delete updateData.course_id;
        delete updateData.created_by;

        const question = await Question.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('topic_id', 'title order');

        if (!question) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }

        return res.status(200).json({
            success: true,
            data: question,
            message: 'Pregunta actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar pregunta:', error);
        return res.status(500).json({ error: 'Error al actualizar pregunta', details: error.message });
    }
};

// Eliminar una pregunta (soft delete)
const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        const question = await Question.findByIdAndUpdate(
            id,
            { is_active: false },
            { new: true }
        );

        if (!question) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }

        return res.status(200).json({
            success: true,
            message: 'Pregunta desactivada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar pregunta:', error);
        return res.status(500).json({ error: 'Error al eliminar pregunta', details: error.message });
    }
};

// Crear múltiples preguntas (bulk)
const createQuestionsInBulk = async (req, res) => {
    try {
        const { questions } = req.body;

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'questions debe ser un array no vacío' });
        }

        // Agregar created_by a todas las preguntas
        const questionsWithCreator = questions.map(q => ({
            ...q,
            created_by: req.user.userId,
            is_active: true
        }));

        const createdQuestions = await Question.insertMany(questionsWithCreator);

        return res.status(201).json({
            success: true,
            data: createdQuestions,
            message: `${createdQuestions.length} preguntas creadas exitosamente`
        });
    } catch (error) {
        console.error('Error al crear preguntas en bulk:', error);
        return res.status(500).json({ error: 'Error al crear preguntas', details: error.message });
    }
};

// Reordenar preguntas de examen final
const reorderExamQuestions = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { question_orders } = req.body; // Array de { question_id, order }

        if (!Array.isArray(question_orders)) {
            return res.status(400).json({ error: 'question_orders debe ser un array' });
        }

        // Actualizar el orden de cada pregunta
        const updatePromises = question_orders.map(({ question_id, order }) =>
            Question.findByIdAndUpdate(question_id, { order })
        );

        await Promise.all(updatePromises);

        // Obtener preguntas actualizadas
        const questions = await Question.find({
            course_id: courseId,
            question_type: 'final_exam',
            is_active: true
        })
            .sort({ order: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: questions,
            message: 'Preguntas reordenadas exitosamente'
        });
    } catch (error) {
        console.error('Error al reordenar preguntas:', error);
        return res.status(500).json({ error: 'Error al reordenar preguntas', details: error.message });
    }
};

module.exports = {
    createQuestion,
    getQuestionsByCourse,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
    createQuestionsInBulk,
    reorderExamQuestions
};