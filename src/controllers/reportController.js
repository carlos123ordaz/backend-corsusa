const UserProgress = require('../models/UserProgress');
const ExamAttempt = require('../models/ExamAttempt');
const Course = require('../models/Course');
const User = require('../models/User');

// Obtener reporte general de capacitaciones
const getGeneralReport = async (req, res) => {
    try {
        const { area, status, from_date, to_date } = req.query;

        // Construir filtro
        const progressFilter = {};

        if (status) {
            progressFilter.status = status;
        }

        if (from_date || to_date) {
            progressFilter.assigned_at = {};
            if (from_date) {
                progressFilter.assigned_at.$gte = new Date(from_date);
            }
            if (to_date) {
                progressFilter.assigned_at.$lte = new Date(to_date);
            }
        }

        // Obtener todos los progresos
        let userProgress = await UserProgress.find(progressFilter)
            .populate({
                path: 'user_id',
                select: 'name lname email areas',
                populate: {
                    path: 'areas',
                    select: 'name'
                }
            })
            .populate({
                path: 'course_id',
                select: 'title description assigned_areas'
            })
            .lean();

        // Filtrar por área si se especifica
        if (area) {
            userProgress = userProgress.filter(up =>
                up.user_id.areas.some(a => a._id.toString() === area)
            );
        }

        // Estadísticas generales
        const stats = {
            total: userProgress.length,
            by_status: {},
            overdue: 0,
            completed_on_time: 0,
            average_completion_percentage: 0
        };

        let totalPercentage = 0;

        userProgress.forEach(up => {
            // Por estado
            stats.by_status[up.status] = (stats.by_status[up.status] || 0) + 1;

            // Vencidos
            if (up.status === 'overdue') {
                stats.overdue++;
            }

            // Completados a tiempo
            if (up.status === 'completed' && up.completed_at <= up.deadline) {
                stats.completed_on_time++;
            }

            totalPercentage += up.overall_progress_percentage;
        });

        stats.average_completion_percentage = userProgress.length > 0
            ? Math.round(totalPercentage / userProgress.length)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                stats,
                progress: userProgress
            }
        });
    } catch (error) {
        console.error('Error al obtener reporte general:', error);
        return res.status(500).json({ error: 'Error al obtener reporte', details: error.message });
    }
};

// Obtener reporte detallado de un curso específico
const getCourseReport = async (req, res) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findById(courseId)
            .populate('assigned_areas', 'name')
            .lean();

        if (!course) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }

        // Obtener todos los progresos del curso
        const userProgress = await UserProgress.find({ course_id: courseId })
            .populate({
                path: 'user_id',
                select: 'name lname email areas position',
                populate: {
                    path: 'areas',
                    select: 'name'
                }
            })
            .lean();

        // Estadísticas del curso
        const stats = {
            total_enrolled: userProgress.length,
            completed: 0,
            in_progress: 0,
            not_started: 0,
            overdue: 0,
            average_progress: 0,
            average_exam_score: 0,
            pass_rate: 0
        };

        let totalProgress = 0;
        let totalExamScore = 0;
        let examAttempts = 0;

        userProgress.forEach(up => {
            stats[up.status]++;
            totalProgress += up.overall_progress_percentage;

            if (up.exam_status === 'passed') {
                totalExamScore += up.best_exam_score;
                examAttempts++;
            }
        });

        stats.average_progress = stats.total_enrolled > 0
            ? Math.round(totalProgress / stats.total_enrolled)
            : 0;

        stats.average_exam_score = examAttempts > 0
            ? Math.round(totalExamScore / examAttempts)
            : 0;

        stats.pass_rate = stats.total_enrolled > 0
            ? Math.round((stats.completed / stats.total_enrolled) * 100)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                course,
                stats,
                user_progress: userProgress
            }
        });
    } catch (error) {
        console.error('Error al obtener reporte del curso:', error);
        return res.status(500).json({ error: 'Error al obtener reporte', details: error.message });
    }
};

// Obtener reporte de un usuario específico
const getUserReport = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .populate('areas', 'name')
            .select('-password')
            .lean();

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener todos los progresos del usuario
        const userProgress = await UserProgress.find({ user_id: userId })
            .populate('course_id', 'title description deadline_days')
            .lean();

        // Estadísticas del usuario
        const stats = {
            total_courses: userProgress.length,
            completed: 0,
            in_progress: 0,
            not_started: 0,
            overdue: 0,
            average_progress: 0,
            average_exam_score: 0,
            courses_passed: 0
        };

        let totalProgress = 0;
        let totalExamScore = 0;
        let examsTaken = 0;

        userProgress.forEach(up => {
            stats[up.status]++;
            totalProgress += up.overall_progress_percentage;

            if (up.exam_attempts > 0) {
                examsTaken++;
                totalExamScore += up.best_exam_score;
            }

            if (up.exam_status === 'passed') {
                stats.courses_passed++;
            }
        });

        stats.average_progress = stats.total_courses > 0
            ? Math.round(totalProgress / stats.total_courses)
            : 0;

        stats.average_exam_score = examsTaken > 0
            ? Math.round(totalExamScore / examsTaken)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                user,
                stats,
                courses: userProgress
            }
        });
    } catch (error) {
        console.error('Error al obtener reporte del usuario:', error);
        return res.status(500).json({ error: 'Error al obtener reporte', details: error.message });
    }
};

// Obtener usuarios con cursos vencidos
const getOverdueCourses = async (req, res) => {
    try {
        const { area } = req.query;

        const filter = {
            status: 'overdue'
        };

        let overdueProgress = await UserProgress.find(filter)
            .populate({
                path: 'user_id',
                select: 'name lname email areas position',
                populate: {
                    path: 'areas',
                    select: 'name'
                }
            })
            .populate('course_id', 'title deadline_days')
            .sort({ deadline: 1 })
            .lean();

        // Filtrar por área si se especifica
        if (area) {
            overdueProgress = overdueProgress.filter(up =>
                up.user_id.areas.some(a => a._id.toString() === area)
            );
        }

        return res.status(200).json({
            success: true,
            data: overdueProgress
        });
    } catch (error) {
        console.error('Error al obtener cursos vencidos:', error);
        return res.status(500).json({ error: 'Error al obtener cursos vencidos', details: error.message });
    }
};

// Obtener estadísticas por área
const getAreaStats = async (req, res) => {
    try {
        const { areaId } = req.params;

        // Obtener usuarios del área
        const users = await User.find({ areas: areaId, active: true }).select('_id');
        const userIds = users.map(u => u._id);

        if (userIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    total_users: 0,
                    stats: {}
                }
            });
        }

        // Obtener progresos de usuarios del área
        const userProgress = await UserProgress.find({ user_id: { $in: userIds } })
            .populate('course_id', 'title')
            .lean();

        // Agrupar por curso
        const courseStats = {};

        userProgress.forEach(up => {
            const courseId = up.course_id._id.toString();
            if (!courseStats[courseId]) {
                courseStats[courseId] = {
                    course_title: up.course_id.title,
                    total_enrolled: 0,
                    completed: 0,
                    in_progress: 0,
                    not_started: 0,
                    overdue: 0,
                    average_progress: 0
                };
            }

            courseStats[courseId].total_enrolled++;
            courseStats[courseId][up.status]++;
            courseStats[courseId].average_progress += up.overall_progress_percentage;
        });

        // Calcular promedios
        Object.keys(courseStats).forEach(courseId => {
            const stats = courseStats[courseId];
            stats.average_progress = stats.total_enrolled > 0
                ? Math.round(stats.average_progress / stats.total_enrolled)
                : 0;
        });

        return res.status(200).json({
            success: true,
            data: {
                total_users: userIds.length,
                total_courses: Object.keys(courseStats).length,
                course_stats: courseStats
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del área:', error);
        return res.status(500).json({ error: 'Error al obtener estadísticas', details: error.message });
    }
};

// Exportar reporte a CSV (retorna los datos, el frontend genera el CSV)
const exportReportData = async (req, res) => {
    try {
        const { courseId, area, status } = req.query;

        const filter = {};

        if (courseId) {
            filter.course_id = courseId;
        }

        if (status) {
            filter.status = status;
        }

        let userProgress = await UserProgress.find(filter)
            .populate({
                path: 'user_id',
                select: 'name lname email areas position dni',
                populate: {
                    path: 'areas',
                    select: 'name'
                }
            })
            .populate('course_id', 'title')
            .lean();

        // Filtrar por área si se especifica
        if (area) {
            userProgress = userProgress.filter(up =>
                up.user_id.areas.some(a => a._id.toString() === area)
            );
        }

        // Formatear datos para exportación
        const exportData = userProgress.map(up => ({
            usuario: `${up.user_id.name} ${up.user_id.lname}`,
            email: up.user_id.email,
            dni: up.user_id.dni,
            cargo: up.user_id.position,
            areas: up.user_id.areas.map(a => a.name).join(', '),
            curso: up.course_id.title,
            estado: up.status,
            progreso: `${up.overall_progress_percentage}%`,
            calificacion_examen: up.best_exam_score > 0 ? `${up.best_exam_score}%` : 'N/A',
            intentos_examen: up.exam_attempts,
            fecha_asignacion: up.assigned_at.toISOString().split('T')[0],
            fecha_limite: up.deadline.toISOString().split('T')[0],
            fecha_completado: up.completed_at ? up.completed_at.toISOString().split('T')[0] : 'N/A'
        }));

        return res.status(200).json({
            success: true,
            data: exportData
        });
    } catch (error) {
        console.error('Error al exportar datos:', error);
        return res.status(500).json({ error: 'Error al exportar datos', details: error.message });
    }
};

module.exports = {
    getGeneralReport,
    getCourseReport,
    getUserReport,
    getOverdueCourses,
    getAreaStats,
    exportReportData
};