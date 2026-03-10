const UserProgress = require('../models/UserProgress');
const ExamAttempt = require('../models/ExamAttempt');
const Course = require('../models/Course');
const Topic = require('../models/Topic');
const Question = require('../models/Question');
const mongoose = require('mongoose');

// Obtener cursos asignados a un usuario
const getUserCourses = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status, search, area } = req.query;

        // Construir filtro
        const filter = { user_id: userId };

        if (status) {
            filter.status = status;
        }

        // Obtener progreso de cursos
        let userProgress = await UserProgress.find(filter)
            .populate({
                path: 'course_id',
                populate: {
                    path: 'assigned_areas',
                    select: 'name'
                }
            })
            .sort({ assigned_at: -1 })
            .lean();

        // Filtrar por búsqueda
        if (search) {
            userProgress = userProgress.filter(up =>
                up.course_id.title.toLowerCase().includes(search.toLowerCase()) ||
                up.course_id.description.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Filtrar por área
        if (area) {
            userProgress = userProgress.filter(up =>
                up.course_id.assigned_areas.some(a => a._id.toString() === area)
            );
        }

        return res.status(200).json({
            success: true,
            data: userProgress
        });
    } catch (error) {
        console.error('Error al obtener cursos del usuario:', error);
        return res.status(500).json({ error: 'Error al obtener cursos', details: error.message });
    }
};

// Obtener progreso detallado de un curso
const getCourseProgress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId } = req.params;

        const progress = await UserProgress.findOne({
            user_id: userId,
            course_id: courseId
        })
            .populate('course_id')
            .populate('topics_progress.topic_id')
            .lean();

        if (!progress) {
            return res.status(404).json({ error: 'Progreso no encontrado' });
        }

        // Obtener información adicional de preguntas intermedias para cada tema
        const topicsWithQuestions = await Promise.all(
            progress.topics_progress.map(async (tp) => {
                const questions = await Question.find({
                    topic_id: tp.topic_id._id,
                    question_type: 'intermediate',
                    is_active: true
                })
                    .sort({ video_timestamp_seconds: 1 })
                    .select('-options.is_correct') // No enviar respuestas correctas al frontend
                    .lean();

                return {
                    ...tp,
                    intermediate_questions: questions
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: {
                ...progress,
                topics_progress: topicsWithQuestions
            }
        });
    } catch (error) {
        console.error('Error al obtener progreso del curso:', error);
        return res.status(500).json({ error: 'Error al obtener progreso', details: error.message });
    }
};

// Iniciar un tema (marcar como "in_progress" y registrar started_at)
const startTopic = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId, topicId } = req.params;

        const progress = await UserProgress.findOne({
            user_id: userId,
            course_id: courseId
        });

        if (!progress) {
            return res.status(404).json({ error: 'Progreso no encontrado' });
        }

        // Buscar el tema en topics_progress
        const topicProgress = progress.topics_progress.find(
            tp => tp.topic_id.toString() === topicId
        );

        if (!topicProgress) {
            return res.status(404).json({ error: 'Tema no encontrado en el progreso' });
        }

        // Si ya está iniciado, no hacer nada
        if (topicProgress.status !== 'not_started') {
            return res.status(200).json({
                success: true,
                data: progress
            });
        }

        // Actualizar estado
        topicProgress.status = 'in_progress';
        topicProgress.started_at = new Date();

        // Actualizar fecha de inicio del curso si es el primer tema
        if (!progress.started_at) {
            progress.started_at = new Date();
        }

        progress.last_accessed_at = new Date();
        await progress.save();

        return res.status(200).json({
            success: true,
            data: progress,
            message: 'Tema iniciado'
        });
    } catch (error) {
        console.error('Error al iniciar tema:', error);
        return res.status(500).json({ error: 'Error al iniciar tema', details: error.message });
    }
};

// Actualizar posición del video
const updateVideoPosition = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId, topicId } = req.params;
        const { position_seconds } = req.body;

        if (position_seconds === undefined) {
            return res.status(400).json({ error: 'position_seconds es requerido' });
        }

        const progress = await UserProgress.findOne({
            user_id: userId,
            course_id: courseId
        });

        if (!progress) {
            return res.status(404).json({ error: 'Progreso no encontrado' });
        }

        // Buscar el tema en topics_progress
        const topicProgress = progress.topics_progress.find(
            tp => tp.topic_id.toString() === topicId
        );

        if (!topicProgress) {
            return res.status(404).json({ error: 'Tema no encontrado en el progreso' });
        }

        // Actualizar posición del video
        topicProgress.last_video_position_seconds = position_seconds;

        // Si el tema no está iniciado, marcarlo como in_progress
        if (topicProgress.status === 'not_started') {
            topicProgress.status = 'in_progress';
            topicProgress.started_at = new Date();
        }

        progress.last_accessed_at = new Date();
        await progress.save();

        return res.status(200).json({
            success: true,
            data: { last_video_position_seconds: position_seconds },
            message: 'Posición actualizada'
        });
    } catch (error) {
        console.error('Error al actualizar posición del video:', error);
        return res.status(500).json({ error: 'Error al actualizar posición', details: error.message });
    }
};

// Responder una pregunta intermedia
const answerIntermediateQuestion = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId, topicId, questionId } = req.params;
        const { selected_options } = req.body; // Array de IDs de opciones seleccionadas

        if (!Array.isArray(selected_options) || selected_options.length === 0) {
            return res.status(400).json({ error: 'selected_options es requerido y debe ser un array' });
        }

        // Obtener la pregunta con las respuestas correctas
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }

        // Verificar respuesta
        const correctOptionIds = question.options
            .filter(opt => opt.is_correct)
            .map(opt => opt._id.toString());

        const selectedOptionIds = selected_options.map(id => id.toString());

        // Comparar arrays (deben coincidir exactamente)
        const isCorrect =
            correctOptionIds.length === selectedOptionIds.length &&
            correctOptionIds.every(id => selectedOptionIds.includes(id)) &&
            selectedOptionIds.every(id => correctOptionIds.includes(id));

        // Obtener progreso del usuario
        const progress = await UserProgress.findOne({
            user_id: userId,
            course_id: courseId
        });

        if (!progress) {
            return res.status(404).json({ error: 'Progreso no encontrado' });
        }

        // Buscar el tema en topics_progress
        const topicProgress = progress.topics_progress.find(
            tp => tp.topic_id.toString() === topicId
        );

        if (!topicProgress) {
            return res.status(404).json({ error: 'Tema no encontrado en el progreso' });
        }

        // Buscar si ya respondió esta pregunta
        const existingAnswer = topicProgress.intermediate_questions_answered.find(
            qa => qa.question_id.toString() === questionId
        );

        if (existingAnswer) {
            // Incrementar intentos y actualizar respuesta
            existingAnswer.attempts += 1;
            existingAnswer.selected_options = selected_options;
            existingAnswer.is_correct = isCorrect;
            existingAnswer.answered_at = new Date();
        } else {
            // Nueva respuesta
            topicProgress.intermediate_questions_answered.push({
                question_id: questionId,
                answered_at: new Date(),
                selected_options: selected_options,
                is_correct: isCorrect,
                attempts: 1
            });
        }

        progress.last_accessed_at = new Date();
        await progress.save();

        return res.status(200).json({
            success: true,
            data: {
                is_correct: isCorrect,
                explanation: question.explanation,
                attempts: existingAnswer ? existingAnswer.attempts : 1,
                correct_options: isCorrect ? null : correctOptionIds // Solo mostrar si es incorrecto
            },
            message: isCorrect ? '¡Respuesta correcta!' : 'Respuesta incorrecta, intenta de nuevo'
        });
    } catch (error) {
        console.error('Error al responder pregunta intermedia:', error);
        return res.status(500).json({ error: 'Error al responder pregunta', details: error.message });
    }
};

// Completar un tema
const completeTopic = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId, topicId } = req.params;

        const progress = await UserProgress.findOne({
            user_id: userId,
            course_id: courseId
        });

        if (!progress) {
            return res.status(404).json({ error: 'Progreso no encontrado' });
        }

        // Buscar el tema en topics_progress
        const topicProgress = progress.topics_progress.find(
            tp => tp.topic_id.toString() === topicId
        );

        if (!topicProgress) {
            return res.status(404).json({ error: 'Tema no encontrado en el progreso' });
        }

        // Verificar que respondió todas las preguntas intermedias correctamente
        const intermediateQuestions = await Question.find({
            topic_id: topicId,
            question_type: 'intermediate',
            is_active: true
        });

        const allAnsweredCorrectly = intermediateQuestions.every(q => {
            const answer = topicProgress.intermediate_questions_answered.find(
                qa => qa.question_id.toString() === q._id.toString()
            );
            return answer && answer.is_correct;
        });

        if (!allAnsweredCorrectly) {
            return res.status(400).json({
                error: 'Debes responder correctamente todas las preguntas intermedias antes de completar el tema'
            });
        }

        // Marcar tema como completado
        topicProgress.status = 'completed';
        topicProgress.completed_at = new Date();

        // Actualizar progreso general
        progress.updateOverallProgress();
        progress.last_accessed_at = new Date();
        await progress.save();

        return res.status(200).json({
            success: true,
            data: progress,
            message: 'Tema completado exitosamente'
        });
    } catch (error) {
        console.error('Error al completar tema:', error);
        return res.status(500).json({ error: 'Error al completar tema', details: error.message });
    }
};

// Obtener preguntas del examen final (sin respuestas correctas)
const getExamQuestions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId } = req.params;

        // Verificar que el usuario puede tomar el examen
        const progress = await UserProgress.findOne({
            user_id: userId,
            course_id: courseId
        }).populate('course_id');

        if (!progress) {
            return res.status(404).json({ error: 'Progreso no encontrado' });
        }

        // Verificar que completó todos los temas
        if (progress.overall_progress_percentage < 100) {
            return res.status(400).json({
                error: 'Debes completar todos los temas antes de tomar el examen final'
            });
        }

        // Verificar límite de intentos
        const examConfig = progress.course_id.exam_config;
        if (!examConfig.allow_retake && progress.exam_attempts >= 1) {
            return res.status(400).json({ error: 'No tienes intentos disponibles' });
        }

        if (examConfig.allow_retake && progress.exam_attempts >= examConfig.max_attempts) {
            return res.status(400).json({
                error: `Has alcanzado el límite de ${examConfig.max_attempts} intentos`
            });
        }

        // Obtener preguntas del examen
        let questions = await Question.find({
            course_id: courseId,
            question_type: 'final_exam',
            is_active: true
        })
            .select('-options.is_correct') // No enviar respuestas correctas
            .lean();

        // Mezclar preguntas si está configurado
        if (examConfig.shuffle_questions) {
            questions = questions.sort(() => Math.random() - 0.5);
        } else {
            questions = questions.sort((a, b) => a.order - b.order);
        }

        return res.status(200).json({
            success: true,
            data: {
                questions,
                exam_config: {
                    passing_score: examConfig.passing_score,
                    attempts_used: progress.exam_attempts,
                    max_attempts: examConfig.max_attempts,
                    allow_retake: examConfig.allow_retake
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener preguntas del examen:', error);
        return res.status(500).json({ error: 'Error al obtener preguntas', details: error.message });
    }
};

// Enviar respuestas del examen final
const submitExam = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId } = req.params;
        const { answers, started_at } = req.body;
        // answers: [{ question_id, selected_options: [] }]

        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ error: 'answers es requerido y debe ser un array' });
        }

        if (!started_at) {
            return res.status(400).json({ error: 'started_at es requerido' });
        }

        const progress = await UserProgress.findOne({
            user_id: userId,
            course_id: courseId
        }).populate('course_id');

        if (!progress) {
            return res.status(404).json({ error: 'Progreso no encontrado' });
        }

        // Obtener todas las preguntas del examen con respuestas correctas
        const questions = await Question.find({
            course_id: courseId,
            question_type: 'final_exam',
            is_active: true
        });

        if (questions.length === 0) {
            return res.status(400).json({ error: 'No hay preguntas de examen configuradas' });
        }

        // Calificar respuestas
        let correctAnswers = 0;
        let totalPoints = 0;
        let pointsEarned = 0;

        const gradedAnswers = answers.map(answer => {
            const question = questions.find(q => q._id.toString() === answer.question_id);

            if (!question) {
                return null;
            }

            const correctOptionIds = question.options
                .filter(opt => opt.is_correct)
                .map(opt => opt._id.toString());

            const selectedOptionIds = answer.selected_options.map(id => id.toString());

            const isCorrect =
                correctOptionIds.length === selectedOptionIds.length &&
                correctOptionIds.every(id => selectedOptionIds.includes(id)) &&
                selectedOptionIds.every(id => correctOptionIds.includes(id));

            totalPoints += question.points;
            if (isCorrect) {
                correctAnswers++;
                pointsEarned += question.points;
            }

            return {
                question_id: question._id,
                selected_options: answer.selected_options,
                is_correct: isCorrect,
                points_earned: isCorrect ? question.points : 0,
                answered_at: new Date()
            };
        }).filter(a => a !== null);

        // Calcular porcentaje
        const scorePercentage = Math.round((pointsEarned / totalPoints) * 100);
        const examConfig = progress.course_id.exam_config;
        const passed = scorePercentage >= examConfig.passing_score;

        // Crear registro de intento
        const examAttempt = new ExamAttempt({
            user_id: userId,
            course_id: courseId,
            user_progress_id: progress._id,
            attempt_number: progress.exam_attempts + 1,
            answers: gradedAnswers,
            total_questions: questions.length,
            correct_answers: correctAnswers,
            total_points: totalPoints,
            points_earned: pointsEarned,
            score_percentage: scorePercentage,
            passing_score: examConfig.passing_score,
            passed: passed,
            started_at: new Date(started_at),
            submitted_at: new Date()
        });

        await examAttempt.save();

        // Actualizar progreso del usuario
        progress.exam_attempts += 1;
        progress.exam_status = passed ? 'passed' : 'failed';

        if (passed && scorePercentage > progress.best_exam_score) {
            progress.best_exam_score = scorePercentage;
        }

        if (passed) {
            progress.status = 'completed';
            progress.completed_at = new Date();

            // Actualizar contador en el curso
            await Course.findByIdAndUpdate(courseId, {
                $inc: { total_completed: 1 }
            });
        }

        progress.last_accessed_at = new Date();
        await progress.save();

        return res.status(200).json({
            success: true,
            data: {
                passed,
                score_percentage: scorePercentage,
                correct_answers: correctAnswers,
                total_questions: questions.length,
                points_earned: pointsEarned,
                total_points: totalPoints,
                attempt_number: examAttempt.attempt_number,
                can_retake: examConfig.allow_retake && examAttempt.attempt_number < examConfig.max_attempts
            },
            message: passed ? '¡Felicitaciones! Has aprobado el curso' : 'No aprobaste el examen. Revisa el material e inténtalo nuevamente.'
        });
    } catch (error) {
        console.error('Error al enviar examen:', error);
        return res.status(500).json({ error: 'Error al enviar examen', details: error.message });
    }
};

// Obtener historial de intentos de examen
const getExamAttempts = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId } = req.params;

        const attempts = await ExamAttempt.find({
            user_id: userId,
            course_id: courseId
        })
            .sort({ attempt_number: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: attempts
        });
    } catch (error) {
        console.error('Error al obtener intentos de examen:', error);
        return res.status(500).json({ error: 'Error al obtener intentos', details: error.message });
    }
};

module.exports = {
    getUserCourses,
    getCourseProgress,
    startTopic,
    updateVideoPosition,
    answerIntermediateQuestion,
    completeTopic,
    getExamQuestions,
    submitExam,
    getExamAttempts
};