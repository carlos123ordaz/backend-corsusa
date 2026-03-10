const WarehouseMovement = require('../models/WarehouseMovement');
const PurchaseItem = require('../models/PurchaseItem');

exports.getAllWarehouseMovements = async (req, res) => {
    try {
        const { page = 1, limit = 20, almacen, status_almacen_1, correlativo_opci } = req.query;

        const filter = {};
        if (almacen) filter.almacen = almacen;
        if (status_almacen_1) filter.status_almacen_1 = status_almacen_1;
        if (correlativo_opci) filter.correlativo_opci = new RegExp(correlativo_opci, 'i');

        const movements = await WarehouseMovement.find(filter)
            .populate('purchase_id', 'numero_oc tipo_compra')
            .populate('purchase_item_id')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await WarehouseMovement.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: movements,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener los movimientos',
            error: error.message
        });
    }
};

exports.createWarehouseMovement = async (req, res) => {
    try {
        const movementData = req.body;

        // Verificar que el purchase item existe
        const purchaseItem = await PurchaseItem.findById(movementData.purchase_item_id)
            .populate('purchase_id');

        if (!purchaseItem) {
            return res.status(404).json({
                success: false,
                message: 'Item de compra no encontrado'
            });
        }

        const newMovement = new WarehouseMovement({
            ...movementData,
            purchase_id: purchaseItem.purchase_id._id,
            correlativo_opci: purchaseItem.purchase_id.correlativo_opci,
            item_op: purchaseItem.item_op,
            item_oc: purchaseItem.item_oc,
            codigo_comercial: purchaseItem.codigo_comercial
        });

        await newMovement.save();

        res.status(201).json({
            success: true,
            message: 'Movimiento creado exitosamente',
            data: newMovement
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear el movimiento',
            error: error.message
        });
    }
};

exports.updateWarehouseMovement = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedMovement = await WarehouseMovement.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedMovement) {
            return res.status(404).json({
                success: false,
                message: 'Movimiento no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Movimiento actualizado exitosamente',
            data: updatedMovement
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el movimiento',
            error: error.message
        });
    }
};