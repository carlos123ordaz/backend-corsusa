const Sede = require("../models/Sede");
const User = require("../models/User");

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findOverlappingSede(latitude, longitude, excludeId = null) {
    const filter = {};
    if (excludeId) filter._id = { $ne: excludeId };
    const sedes = await Sede.find(filter);
    return sedes.find((s) => haversineDistance(latitude, longitude, s.latitude, s.longitude) < s.radio) ?? null;
}

const insertSede = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        if (latitude != null && longitude != null) {
            const conflict = await findOverlappingSede(latitude, longitude);
            if (conflict) {
                return res.status(409).json({
                    error: `Las coordenadas caen dentro del radio de "${conflict.nombre}" (${conflict.radio}m). Ajusta la ubicación.`,
                    conflictWith: conflict._id,
                });
            }
        }
        const result = new Sede(req.body);
        await result.save();
        return res.status(200).json({ ok: 'Sucessfull' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateSede = async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude } = req.body;
        if (latitude != null && longitude != null) {
            const conflict = await findOverlappingSede(latitude, longitude, id);
            if (conflict) {
                return res.status(409).json({
                    error: `Las coordenadas caen dentro del radio de "${conflict.nombre}" (${conflict.radio}m). Ajusta la ubicación.`,
                    conflictWith: conflict._id,
                });
            }
        }
        const result = await Sede.findByIdAndUpdate(id, req.body, { new: true });
        if (!result) return res.status(404).send({ error: 'Sede no existe' });
        return res.status(200).json({ ok: 'Sucessfull' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getAllSedes = async (req, res) => {
    try {
        const result = await Sede.find({}).sort({ createdAt: -1 });
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const deleteSede = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Sede.findByIdAndDelete(id);
        if (!result) return res.status(404).send({ error: 'Sede no existe' });
        return res.status(200).json({ ok: 'Sucessfull' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const registerFromDevice = async (req, res) => {
    try {
        const { userId, latitude, longitude, nombre: nombreParam } = req.body;
        if (!userId || latitude == null || longitude == null) {
            return res.status(400).json({ error: 'userId, latitude y longitude son requeridos' });
        }

        const conflict = await findOverlappingSede(latitude, longitude);
        if (conflict) {
            return res.status(409).json({
                error: `Las coordenadas caen dentro del radio de "${conflict.nombre}" (${conflict.radio}m).`,
                conflictWith: conflict._id,
            });
        }

        let nombre = nombreParam?.trim();
        if (!nombre) {
            const count = await Sede.countDocuments();
            nombre = `Sede #${count + 1}`;
        }

        const sede = new Sede({ nombre, latitude, longitude, radio: 100 });
        await sede.save();

        await User.findByIdAndUpdate(userId, { sede: sede._id });

        return res.status(200).json({ sede });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    insertSede,
    getAllSedes,
    updateSede,
    deleteSede,
    registerFromDevice,
};
