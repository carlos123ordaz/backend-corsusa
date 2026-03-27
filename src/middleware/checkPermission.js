const User = require('../models/User');

const checkPermission = (permissionKey) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user.userId).populate('role');

            if (!user || !user.role) {
                return res.status(403).json({ error: 'No tiene un rol asignado' });
            }

            if (user.role.isAdmin) {
                return next();
            }

            if (user.role.permissions.includes(permissionKey)) {
                return next();
            }

            return res.status(403).json({ error: 'No tiene permisos para esta acción' });
        } catch (error) {
            console.error('Error verificando permisos:', error);
            return res.status(500).json({ error: 'Error verificando permisos' });
        }
    };
};

module.exports = checkPermission;
