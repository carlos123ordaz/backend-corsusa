const SalesInvoice = require('../models/SalesInvoice');
const Sale = require('../models/Sale');

exports.getAllSalesInvoices = async (req, res) => {
    try {
        const { page = 1, limit = 20, status_factura, venta_id, correlativo_opci } = req.query;

        const filter = {};
        if (status_factura) filter.status_factura = status_factura;
        if (venta_id) filter.venta_id = venta_id;
        if (correlativo_opci) filter.correlativo_opci = new RegExp(correlativo_opci, 'i');

        const invoices = await SalesInvoice.find(filter)
            .populate('venta_id', 'correlativo_opci numero_op cliente_id')
            .sort({ 'fechas.fecha_emision': -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await SalesInvoice.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: invoices,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener las facturas',
            error: error.message
        });
    }
};

exports.getSalesInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await SalesInvoice.findById(id)
            .populate('venta_id')
            .lean();

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            data: invoice
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener la factura',
            error: error.message
        });
    }
};

exports.createSalesInvoice = async (req, res) => {
    try {
        const invoiceData = req.body;

        // Verificar que la venta existe
        const sale = await Sale.findById(invoiceData.venta_id);
        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }

        // Agregar el correlativo_opci de la venta si no está presente
        if (!invoiceData.correlativo_opci) {
            invoiceData.correlativo_opci = sale.correlativo_opci;
        }

        const newInvoice = new SalesInvoice(invoiceData);
        await newInvoice.save();

        res.status(201).json({
            success: true,
            message: 'Factura creada exitosamente',
            data: newInvoice
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear la factura',
            error: error.message
        });
    }
};

exports.updateSalesInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedInvoice = await SalesInvoice.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('venta_id');

        if (!updatedInvoice) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Factura actualizada exitosamente',
            data: updatedInvoice
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la factura',
            error: error.message
        });
    }
};