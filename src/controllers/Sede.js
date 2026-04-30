const Sede = require("../models/Sede");
const User = require("../models/User");

const insertSede = async (req, res) => {
    try {
        const result = new Sede(req.body);
        await result.save();
        return res.status(200).json({ ok: 'Sucessfull' });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
const updateSede = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Sede.findByIdAndUpdate(id, req.body, { new: true });
        if (!result) return res.status(404).send({ error: 'Sede no existe' });
        return res.status(200).json({ ok: 'Sucessfull' });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const getAllSedes = async (req, res) => {
    try {
        const result = await Sede.find({}).sort({ createdAt: -1 });
        return res.status(200).json(result);
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
const deleteSede = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Sede.findByIdAndDelete(id);
        if (!result) return res.status(404).send({ error: 'Sede no existe' });
        return res.status(200).json({ ok: 'Sucessfull' });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
const registerFromDevice = async (req, res) => {
    try {
        const { userId, latitude, longitude } = req.body;
        if (!userId || latitude == null || longitude == null) {
            return res.status(400).json({ error: 'userId, latitude y longitude son requeridos' });
        }

        const count = await Sede.countDocuments();
        const nombre = `Sede #${count + 1}`;

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
    registerFromDevice
}

