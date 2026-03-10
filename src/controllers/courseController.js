const Course = require('../models/Course');
const Topic = require('../models/Topic');
const Question = require('../models/Question');
const UserProgress = require('../models/UserProgress');
const User = require('../models/User');

// Crear un nuevo curso
const createCourse = async (req, res) => {
    try {
        const {
            title,
            description,
            thumbnail,
            estimated_duration_hours,
            deadline_days,
            assigned_areas,
            assigned_users,
            exam_config
        } = req.body;

        // Validaciones
        if (!title || !description) {
            return res.status(400).json({ error: 'Título y descripción son requeridos' });
        }

        const course = new Course({
            title,
            description,
            thumbnail,
            estimated_duration_hours,
            deadline_days: deadline_days || 30,
            assigned_areas: assigned_areas || [],
            assigned_users: assigned_users || [],
            exam_config: exam_config || {},
            created_by: req.user.userId // Del middleware de autenticación
        });

        await course.save();

        // Crear registros de progreso para usuarios asignados
        await assignCourseToUsers(course);

        return res.status(201).json({
            success: true,
            data: course,
            message: 'Curso creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear curso:', error);
        return res.status(500).json({ error: 'Error al crear curso', details: error.message });
    }
};

// Función auxiliar para asignar curso a usuarios
const assignCourseToUsers = async (course) => {
    try {
        const userIds = new Set();

        // Usuarios específicos
        if (course.assigned_users && course.assigned_users.length > 0) {
            course.assigned_users.forEach(userId => userIds.add(userId.toString()));
        }

        // Usuarios de áreas asignadas
        if (course.assigned_areas && course.assigned_areas.length > 0) {
            const usersInAreas = await User.find({
                areas: { $in: course.assigned_areas },
                active: true
            }).select('_id');

            usersInAreas.forEach(user => userIds.add(user._id.toString()));
        }

        // Crear UserProgress para cada usuario
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + course.deadline_days);

        const progressRecords = Array.from(userIds).map(userId => ({
            user_id: userId,
            course_id: course._id,
            assigned_at: new Date(),
            deadline: deadline,
            status: 'not_started',
            topics_progress: [],
            exam_status: 'not_attempted',
            exam_attempts: 0,
            best_exam_score: 0,
            overall_progress_percentage: 0
        }));

        if (progressRecords.length > 0) {
            await UserProgress.insertMany(progressRecords, { ordered: false });
            course.total_enrolled = progressRecords.length;
            await course.save();
        }
    } catch (error) {
        console.error('Error al asignar curso a usuarios:', error);
    }
};

// Obtener todos los cursos (con filtros)
const getCourses = async (req, res) => {
    try {
        const { search, is_active, assigned_area } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Construir filtro
        const filter = {};

        if (search) {
            filter.$text = { $search: search };
        }

        if (is_active !== undefined) {
            filter.is_active = is_active === 'true';
        }

        if (assigned_area) {
            filter.assigned_areas = assigned_area;
        }

        const total = await Course.countDocuments(filter);
        const courses = await Course.find(filter)
            .populate('assigned_areas', 'name')
            .populate('created_by', 'name lname email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            data: courses,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener cursos:', error);
        return res.status(500).json({ error: 'Error al obtener cursos', details: error.message });
    }
};

// Obtener un curso por ID con sus temas y preguntas
const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id)
            .populate('assigned_areas', 'name')
            .populate('created_by', 'name lname email')
            .lean();

        if (!course) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }

        // Obtener temas del curso
        const topics = await Topic.find({ course_id: id, is_active: true })
            .sort({ order: 1 })
            .lean();

        // Obtener preguntas de examen final
        const examQuestions = await Question.find({
            course_id: id,
            question_type: 'final_exam',
            is_active: true
        })
            .sort({ order: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                ...course,
                topics,
                exam_questions: examQuestions
            }
        });
    } catch (error) {
        console.error('Error al obtener curso:', error);
        return res.status(500).json({ error: 'Error al obtener curso', details: error.message });
    }
};

// Actualizar un curso
const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // No permitir actualizar ciertos campos directamente
        delete updateData.created_by;
        delete updateData.total_topics;
        delete updateData.total_enrolled;
        delete updateData.total_completed;

        const course = await Course.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('assigned_areas', 'name')
            .populate('created_by', 'name lname email');

        if (!course) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }

        // Si cambió la asignación de áreas o usuarios, actualizar UserProgress
        if (updateData.assigned_areas || updateData.assigned_users) {
            await assignCourseToUsers(course);
        }

        return res.status(200).json({
            success: true,
            data: course,
            message: 'Curso actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar curso:', error);
        return res.status(500).json({ error: 'Error al actualizar curso', details: error.message });
    }
};

// Eliminar un curso (soft delete)
const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findByIdAndUpdate(
            id,
            { is_active: false },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }

        return res.status(200).json({
            success: true,
            message: 'Curso desactivado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar curso:', error);
        return res.status(500).json({ error: 'Error al eliminar curso', details: error.message });
    }
};

// Obtener estadísticas de un curso
const getCourseStats = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }

        // Obtener progreso de usuarios
        const progressStats = await UserProgress.aggregate([
            { $match: { course_id: course._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Obtener promedio de calificaciones del examen
        const examStats = await UserProgress.aggregate([
            { $match: { course_id: course._id, exam_status: 'passed' } },
            {
                $group: {
                    _id: null,
                    average_score: { $avg: '$best_exam_score' },
                    max_score: { $max: '$best_exam_score' },
                    min_score: { $min: '$best_exam_score' }
                }
            }
        ]);

        const stats = {
            total_enrolled: course.total_enrolled,
            by_status: {},
            exam_stats: examStats[0] || null
        };

        progressStats.forEach(stat => {
            stats.by_status[stat._id] = stat.count;
        });

        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({ error: 'Error al obtener estadísticas', details: error.message });
    }
};

module.exports = {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    getCourseStats
};