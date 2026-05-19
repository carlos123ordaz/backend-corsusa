const ScheduleOrder = require('../models/ScheduleOrder');

exports.getOrder = async (req, res) => {
    try {
        const { areaId } = req.query;
        if (!areaId) return res.status(400).json({ success: false, message: 'areaId es requerido' });

        const doc = await ScheduleOrder.findOne({ viewerId: req.user.userId, areaId });
        res.json({ success: true, data: doc ? doc.order.map(String) : [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.saveOrder = async (req, res) => {
    try {
        const { areaId } = req.query;
        const { order } = req.body;
        if (!areaId) return res.status(400).json({ success: false, message: 'areaId es requerido' });
        if (!Array.isArray(order)) return res.status(400).json({ success: false, message: 'order debe ser un array' });

        const doc = await ScheduleOrder.findOneAndUpdate(
            { viewerId: req.user.userId, areaId },
            { order },
            { upsert: true, new: true }
        );
        res.json({ success: true, data: doc.order.map(String) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
