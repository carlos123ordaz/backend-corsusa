const Sede = require("../models/Sede");

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
module.exports = {
    insertSede,
    getAllSedes,
    updateSede,
    deleteSede
}

