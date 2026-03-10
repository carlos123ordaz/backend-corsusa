const UnitOfMeasure = require('../models/UnitOfMeasure');

exports.getAllUnitsOfMeasure = async (req, res) => {
    try {
        const { tipo } = req.query;

        const filter = {};
        if (tipo) filter.tipo = tipo;

        const units = await UnitOfMeasure.find(filter).lean();

        res.status(200).json({
            success: true,
            data: units
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener las unidades de medida',
            error: error.message
        });
    }
};

exports.createUnitOfMeasure = async (req, res) => {
    try {
        const newUnit = new UnitOfMeasure(req.body);
        await newUnit.save();

        res.status(201).json({
            success: true,
            data: newUnit
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear la unidad de medida',
            error: error.message
        });
    }
};