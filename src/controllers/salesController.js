// controllers/salesController.js
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const SalesInvoice = require('../models/SalesInvoice');

/**
 * Obtener todas las ventas (solo encabezados)
 * GET /api/sales
 */
exports.getAllSales = async (req, res) => {
    try {
        const { page = 1, limit = 20, estado, cliente_id, correlativo_opci } = req.query;

        const filter = {};
        if (estado) filter.estado = estado;
        if (cliente_id) filter.cliente_id = cliente_id;
        if (correlativo_opci) filter.correlativo_opci = new RegExp(correlativo_opci, 'i');

        const sales = await Sale.find(filter)
            .populate('cliente_id', 'razon_social ruc')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await Sale.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: sales,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Error en getAllSales:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las ventas',
            error: error.message
        });
    }
};

/**
 * Obtener una venta específica con todos sus items
 * GET /api/sales/:id
 */
exports.getSaleById = async (req, res) => {
    try {
        const { id } = req.params;

        const sale = await Sale.findById(id)
            .populate('cliente_id')
            .lean();

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }

        // Obtener todos los items de la venta
        const items = await SaleItem.find({ venta_id: id }).lean();

        // Obtener facturas relacionadas
        const invoices = await SalesInvoice.find({ venta_id: id }).lean();

        res.status(200).json({
            success: true,
            data: {
                ...sale,
                items,
                invoices
            }
        });
    } catch (error) {
        console.error('Error en getSaleById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la venta',
            error: error.message
        });
    }
};

/**
 * Crear una nueva venta
 * POST /api/sales
 */
exports.createSale = async (req, res) => {
    try {
        const saleData = req.body;

        const newSale = new Sale(saleData);
        await newSale.save();

        res.status(201).json({
            success: true,
            message: 'Venta creada exitosamente',
            data: newSale
        });
    } catch (error) {
        console.error('Error en createSale:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la venta',
            error: error.message
        });
    }
};

/**
 * Actualizar una venta (solo cabecera)
 * PUT /api/sales/:id
 */
exports.updateSale = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedSale = await Sale.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('cliente_id');

        if (!updatedSale) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Venta actualizada exitosamente',
            data: updatedSale
        });
    } catch (error) {
        console.error('Error en updateSale:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la venta',
            error: error.message
        });
    }
};

/**
 * Eliminar una venta
 * DELETE /api/sales/:id
 */
exports.deleteSale = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si hay items asociados
        const itemCount = await SaleItem.countDocuments({ venta_id: id });

        if (itemCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar una venta con items asociados'
            });
        }

        const deletedSale = await Sale.findByIdAndDelete(id);

        if (!deletedSale) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Venta eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error en deleteSale:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la venta',
            error: error.message
        });
    }
};

/**
 * Agregar un item a una venta
 * POST /api/sales/:id/items
 */
exports.addSaleItem = async (req, res) => {
    try {
        const { id } = req.params;
        const itemData = req.body;
        const sale = await Sale.findById(id);
        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }

        const newItem = new SaleItem({
            ...itemData,
            venta_id: id
        });

        await newItem.save();

        res.status(201).json({
            success: true,
            message: 'Item agregado exitosamente',
            data: newItem
        });
    } catch (error) {
        console.error('Error en addSaleItem:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar el item',
            error: error.message
        });
    }
};

/**
 * Actualizar un item de venta
 * PUT /api/sales/:saleId/items/:itemId
 */
exports.updateSaleItem = async (req, res) => {
    try {
        const { saleId, itemId } = req.params;
        const updateData = req.body;

        const updatedItem = await SaleItem.findOneAndUpdate(
            { _id: itemId, venta_id: saleId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: 'Item no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Item actualizado exitosamente',
            data: updatedItem
        });
    } catch (error) {
        console.error('Error en updateSaleItem:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el item',
            error: error.message
        });
    }
};

/**
 * Eliminar un item de venta
 * DELETE /api/sales/:saleId/items/:itemId
 */
exports.deleteSaleItem = async (req, res) => {
    try {
        const { saleId, itemId } = req.params;

        const deletedItem = await SaleItem.findOneAndDelete({
            _id: itemId,
            venta_id: saleId
        });

        if (!deletedItem) {
            return res.status(404).json({
                success: false,
                message: 'Item no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Item eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error en deleteSaleItem:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el item',
            error: error.message
        });
    }
};

/**
 * Obtener items de una venta por correlativo_opci (para usar en compras)
 * GET /api/sales/by-opci/:correlativo_opci/items
 */
exports.getSaleItemsByOPCI = async (req, res) => {
    try {
        const { correlativo_opci } = req.params;

        const sale = await Sale.findOne({ correlativo_opci }).lean();

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada con ese OPCI'
            });
        }

        const items = await SaleItem.find({ venta_id: sale._id }).lean();

        res.status(200).json({
            success: true,
            data: {
                sale: {
                    _id: sale._id,
                    correlativo_opci: sale.correlativo_opci,
                    numero_op: sale.numero_op,
                    cliente_id: sale.cliente_id
                },
                items
            }
        });
    } catch (error) {
        console.error('Error en getSaleItemsByOPCI:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los items',
            error: error.message
        });
    }
};