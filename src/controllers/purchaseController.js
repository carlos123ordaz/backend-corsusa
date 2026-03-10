// controllers/purchaseController.js
const Purchase = require('../models/Purchase');
const PurchaseItem = require('../models/PurchaseItem');
const SaleItem = require('../models/SaleItem');
const Sale = require('../models/Sale');

/**
 * Obtener todas las compras (solo encabezados)
 * GET /api/purchases
 */
exports.getAllPurchases = async (req, res) => {
    try {
        const { page = 1, limit = 20, estado, tipo_compra, numero_oc } = req.query;

        const filter = {};
        if (estado) filter.estado = estado;
        if (tipo_compra) filter.tipo_compra = tipo_compra;
        if (numero_oc) filter.numero_oc = new RegExp(numero_oc, 'i');

        const purchases = await Purchase.find(filter)
            .populate('proveedor_id', 'razon_social ruc')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await Purchase.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: purchases,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Error en getAllPurchases:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las compras',
            error: error.message
        });
    }
};

/**
 * Obtener una compra específica con todos sus items
 * GET /api/purchases/:id
 */
exports.getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;

        const purchase = await Purchase.findById(id)
            .populate('proveedor_id')
            .lean();

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Compra no encontrada'
            });
        }

        // Obtener todos los items de la compra con información de la venta
        const items = await PurchaseItem.find({ purchase_id: id })
            .populate({
                path: 'item_venta_id',
                populate: {
                    path: 'venta_id',
                    select: 'correlativo_opci numero_op cliente_id'
                }
            })
            .lean();

        res.status(200).json({
            success: true,
            data: {
                ...purchase,
                items
            }
        });
    } catch (error) {
        console.error('Error en getPurchaseById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la compra',
            error: error.message
        });
    }
};

/**
 * Crear una nueva compra (solo cabecera)
 * POST /api/purchases
 */
exports.createPurchase = async (req, res) => {
    try {
        const purchaseData = req.body;

        const newPurchase = new Purchase(purchaseData);
        await newPurchase.save();

        res.status(201).json({
            success: true,
            message: 'Compra creada exitosamente',
            data: newPurchase
        });
    } catch (error) {
        console.error('Error en createPurchase:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la compra',
            error: error.message
        });
    }
};

/**
 * Actualizar una compra (solo cabecera)
 * PUT /api/purchases/:id
 */
exports.updatePurchase = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedPurchase = await Purchase.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('proveedor_id');

        if (!updatedPurchase) {
            return res.status(404).json({
                success: false,
                message: 'Compra no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Compra actualizada exitosamente',
            data: updatedPurchase
        });
    } catch (error) {
        console.error('Error en updatePurchase:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la compra',
            error: error.message
        });
    }
};

/**
 * Eliminar una compra
 * DELETE /api/purchases/:id
 */
exports.deletePurchase = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si hay items asociados
        const itemCount = await PurchaseItem.countDocuments({ purchase_id: id });

        if (itemCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar una compra con items asociados'
            });
        }

        const deletedPurchase = await Purchase.findByIdAndDelete(id);

        if (!deletedPurchase) {
            return res.status(404).json({
                success: false,
                message: 'Compra no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Compra eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error en deletePurchase:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la compra',
            error: error.message
        });
    }
};

/**
 * Agregar items desde una venta a una compra
 * POST /api/purchases/:id/add-from-sale
 * Body: { correlativo_opci, items: [{ item_venta_id, cantidad, pcu1, ... }] }
 */
exports.addItemsFromSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { correlativo_opci, items } = req.body;

        // Verificar que la compra existe
        const purchase = await Purchase.findById(id);
        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Compra no encontrada'
            });
        }

        // Buscar la venta por OPCI
        const sale = await Sale.findOne({ correlativo_opci });
        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada con ese OPCI'
            });
        }

        // Obtener el próximo número de item para esta compra
        const lastItem = await PurchaseItem.findOne({ purchase_id: id })
            .sort({ item_oc: -1 })
            .lean();

        let nextItemOC = lastItem ? lastItem.item_oc + 1 : 1;

        // Crear los items de compra
        const purchaseItems = [];

        for (const item of items) {
            // Verificar que el item de venta existe y pertenece a la venta correcta
            const saleItem = await SaleItem.findOne({
                _id: item.item_venta_id,
                venta_id: sale._id
            });

            if (!saleItem) {
                continue; // Saltar items inválidos
            }

            const purchaseItem = new PurchaseItem({
                purchase_id: id,
                item_venta_id: item.item_venta_id,
                item_oc: nextItemOC++,
                item_op: saleItem.item_op,
                codigo_comercial: saleItem.codigo_comercial,
                cantidad: item.cantidad || saleItem.cantidad,
                unidad_medida: item.unidad_medida || saleItem.unidad_medida,
                moneda: item.moneda || saleItem.moneda,
                pcu1: item.pcu1,
                pcu2: item.pcu2,
                tipo_cambio_usd: item.tipo_cambio_usd,
                tiempo_entrega_semanas: item.tiempo_entrega_semanas || saleItem.tiempo_entrega_semanas,
                // Datos específicos según tipo de compra
                importacion: purchase.tipo_compra === 'importacion' ? item.importacion : undefined,
                local: purchase.tipo_compra === 'local' ? item.local : undefined,
                estado: 'pendiente'
            });

            await purchaseItem.save();
            purchaseItems.push(purchaseItem);
        }

        // Actualizar el correlativo_opci en la compra si no existe
        if (!purchase.correlativo_opci) {
            purchase.correlativo_opci = correlativo_opci;
            await purchase.save();
        }

        res.status(201).json({
            success: true,
            message: `${purchaseItems.length} items agregados exitosamente`,
            data: purchaseItems
        });
    } catch (error) {
        console.error('Error en addItemsFromSale:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar items desde la venta',
            error: error.message
        });
    }
};

/**
 * Actualizar un item de compra
 * PUT /api/purchases/:purchaseId/items/:itemId
 */
exports.updatePurchaseItem = async (req, res) => {
    try {
        const { purchaseId, itemId } = req.params;
        const updateData = req.body;

        const updatedItem = await PurchaseItem.findOneAndUpdate(
            { _id: itemId, purchase_id: purchaseId },
            updateData,
            { new: true, runValidators: true }
        ).populate('item_venta_id');

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
        console.error('Error en updatePurchaseItem:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el item',
            error: error.message
        });
    }
};

/**
 * Eliminar un item de compra
 * DELETE /api/purchases/:purchaseId/items/:itemId
 */
exports.deletePurchaseItem = async (req, res) => {
    try {
        const { purchaseId, itemId } = req.params;

        const deletedItem = await PurchaseItem.findOneAndDelete({
            _id: itemId,
            purchase_id: purchaseId
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
        console.error('Error en deletePurchaseItem:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el item',
            error: error.message
        });
    }
};

/**
 * Cambiar estado de una compra
 * PATCH /api/purchases/:id/status
 */
exports.changePurchaseStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const validStates = ['borrador', 'emitida', 'confirmada', 'parcial', 'cerrada', 'anulada'];

        if (!validStates.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }

        const purchase = await Purchase.findByIdAndUpdate(
            id,
            { estado },
            { new: true }
        );

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Compra no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Estado actualizado exitosamente',
            data: purchase
        });
    } catch (error) {
        console.error('Error en changePurchaseStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado',
            error: error.message
        });
    }
};