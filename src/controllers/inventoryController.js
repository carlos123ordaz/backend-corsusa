const Inventory = require('../models/Inventory');

exports.getAllInventory = async (req, res) => {
    try {
        const { almacen, codigo_comercial } = req.query;

        const filter = {};
        if (almacen) filter.almacen = almacen;
        if (codigo_comercial) filter.codigo_comercial = new RegExp(codigo_comercial, 'i');

        const inventory = await Inventory.find(filter).lean();

        res.status(200).json({
            success: true,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el inventario',
            error: error.message
        });
    }
};

exports.updateInventoryStock = async (req, res) => {
    try {
        const { codigo_comercial, almacen, cantidad } = req.body;

        let inventory = await Inventory.findOne({ codigo_comercial, almacen });

        if (!inventory) {
            inventory = new Inventory({
                codigo_comercial,
                almacen,
                stock_actual: cantidad
            });
        } else {
            inventory.stock_actual += cantidad;
        }

        await inventory.save();

        res.status(200).json({
            success: true,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el inventario',
            error: error.message
        });
    }
};