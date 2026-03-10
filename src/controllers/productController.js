// controllers/productController.js
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

/**
 * Obtener todos los productos
 * GET /api/products
 */
exports.getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 50, estado, brand, codigo_comercial } = req.query;

        const filter = {};
        if (estado) filter.estado = estado;
        if (brand) filter.brand = new RegExp(brand, 'i');
        if (codigo_comercial) filter.codigo_comercial = new RegExp(codigo_comercial, 'i');

        const products = await Product.find(filter)
            .sort({ codigo_comercial: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const count = await Product.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: products,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Error en getAllProducts:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los productos',
            error: error.message
        });
    }
};

/**
 * Obtener un producto por ID con su inventario
 * GET /api/products/:id
 */
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id).lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        // Obtener inventario del producto
        const inventory = await Inventory.find({
            codigo_comercial: product.codigo_comercial
        }).lean();

        res.status(200).json({
            success: true,
            data: {
                ...product,
                inventory
            }
        });
    } catch (error) {
        console.error('Error en getProductById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el producto',
            error: error.message
        });
    }
};

/**
 * Crear un nuevo producto
 * POST /api/products
 */
exports.createProduct = async (req, res) => {
    try {
        const productData = req.body;

        const newProduct = new Product(productData);
        await newProduct.save();

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            data: newProduct
        });
    } catch (error) {
        console.error('Error en createProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el producto',
            error: error.message
        });
    }
};

/**
 * Actualizar un producto
 * PUT /api/products/:id
 */
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Producto actualizado exitosamente',
            data: updatedProduct
        });
    } catch (error) {
        console.error('Error en updateProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el producto',
            error: error.message
        });
    }
};

/**
 * Eliminar un producto
 * DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Producto eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error en deleteProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el producto',
            error: error.message
        });
    }
};