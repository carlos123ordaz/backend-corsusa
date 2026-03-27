const Role = require('../models/Role');
const User = require('../models/User');

exports.getAllRoles = async (req, res) => {
    try {
        const roles = await Role.find({ active: true }).sort({ name: 1 });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRoleById = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }
        res.json(role);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createRole = async (req, res) => {
    try {
        const { name, description, isAdmin, permissions } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'El nombre del rol es requerido' });
        }

        const existingRole = await Role.findOne({ name: name.trim() });
        if (existingRole) {
            return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
        }

        const role = new Role({
            name: name.trim(),
            description: description || '',
            isAdmin: isAdmin || false,
            permissions: permissions || [],
        });

        await role.save();
        res.status(201).json(role);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const { name, description, isAdmin, permissions, active } = req.body;

        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }

        if (name !== undefined) role.name = name.trim();
        if (description !== undefined) role.description = description;
        if (isAdmin !== undefined) role.isAdmin = isAdmin;
        if (permissions !== undefined) role.permissions = permissions;
        if (active !== undefined) role.active = active;

        await role.save();
        res.json(role);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ error: 'Rol no encontrado' });
        }

        const usersWithRole = await User.countDocuments({ role: role._id });
        if (usersWithRole > 0) {
            return res.status(400).json({
                error: `No se puede eliminar el rol porque hay ${usersWithRole} usuario(s) asignado(s)`,
            });
        }

        await Role.findByIdAndDelete(req.params.id);
        res.json({ ok: 'Rol eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
