const Gira = require("../models/Gira");
const mongoose = require('mongoose');

const addGira = async (req, res) => {
    try {
        const gira = new Gira(req.body);
        await gira.save();
        res.status(200).send({ ok: 'Successfull' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
}

const getGiras = async (req, res) => {
    try {
        const giras = await Gira.find({}).sort({ createdAt: -1 }).populate('user');
        res.status(200).send(giras);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
}

const getGirasByIdUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const giras = await Gira.find({ user: userId });
        return res.status(200).json(giras);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
}


const getGiraById = async (req, res) => {
    try {
        const { id } = req.params;
        const gira = await Gira.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: 'gastos',
                    localField: '_id',
                    foreignField: 'gira',
                    as: 'gastos'
                }
            },
            {
                $addFields: {
                    gasto_soles: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$gastos',
                                        as: 'gasto',
                                        cond: { $eq: ['$$gasto.moneda', 'PEN'] }
                                    }
                                },
                                as: 'gasto',
                                in: '$$gasto.total'
                            }
                        }
                    },
                    gasto_dolares: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$gastos',
                                        as: 'gasto',
                                        cond: { $eq: ['$$gasto.moneda', 'USD'] }
                                    }
                                },
                                as: 'gasto',
                                in: '$$gasto.total'
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    gastos: 0
                }
            }
        ]);

        if (!gira || gira.length === 0) {
            return res.status(404).json({ error: 'Gira no encontrada' });
        }

        if (!gira[0].active) {
            return res.status(400).json({ error: 'La gira no está activa' });
        }

        res.status(200).json(gira[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error en el servidor' });
    }
};

const deleteGira = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Gira.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ error: 'Gira no encontrada' });
        }
        res.status(200).json({ ok: 'Successful' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error on server' });
    }
}

module.exports = {
    addGira,
    getGiras,
    deleteGira,
    getGiraById,
    getGirasByIdUser
}