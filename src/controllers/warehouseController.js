const Warehouse = require('../models/Warehouse');

exports.getAllWarehouses = async (req, res) => {
    try {
        const { estado } = req.query;

        const filter = {};
        if (estado) filter.estado = estado;

        const warehouses = await Warehouse.find(filter).lean();

        res.status(200).json({
            success: true,
            data: warehouses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener los almacenes',
            error: error.message
        });
    }
};

exports.createWarehouse = async (req, res) => {
    try {
        const newWarehouse = new Warehouse(req.body);
        await newWarehouse.save();

        res.status(201).json({
            success: true,
            data: newWarehouse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear el almacén',
            error: error.message
        });
    }
};

exports.updateWarehouse = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedWarehouse = await Warehouse.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedWarehouse) {
            return res.status(404).json({
                success: false,
                message: 'Almacén no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: updatedWarehouse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el almacén',
            error: error.message
        });
    }
};