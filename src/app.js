const express = require('express');
const cors = require('cors');
require('./models/index');

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('v.1.0.13');
});

app.use('/api/auth', require('./routes/Auth'));
app.use('/api/expenses', require('./routes/Gasto'));
app.use('/api/users', require('./routes/User'));
app.use('/api/locations', require('./routes/Sede'));
app.use('/api/attendance', require('./routes/Asistencia'));
app.use('/api/incidencias', require('./routes/incidencia'));
app.use('/api/work-types', require('./routes/workTypeRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/areas', require('./routes/areaRoutes'));

app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/business-partners', require('./routes/businessPartnerRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/units-of-measure', require('./routes/unitOfMeasureRoutes'));
app.use('/api/sales-invoices', require('./routes/salesInvoiceRoutes'));
app.use('/api/warehouse-movements', require('./routes/warehouseMovementRoutes'));
app.use('/api/schedule-configs', require('./routes/scheduleConfigRoutes'));
app.use('/api/warehouses', require('./routes/warehouseRoutes'));
app.use('/api/warehouse-movements', require('./routes/warehouseMovementRoutes'));

app.use('/api/cost-centers', require('./routes/costCenterRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));

app.use('/api/training/courses', require('./routes/courseRoutes'));
app.use('/api/training/topics', require('./routes/topicRoutes'));
app.use('/api/training/questions', require('./routes/questionRoutes'));
app.use('/api/training/progress', require('./routes/progressRoutes'));
app.use('/api/training/reports', require('./routes/reportRoutes'));
app.use('/api/images', require('./routes/imageRoutes'));

app.use('/api/bitrix/tasks', require('./routes/bitrixTaskRoutes'));
app.use('/api/bitrix/users', require('./routes/bitrixUserRoutes'));

const { registerQuotationRoutes } = require('./routes/quotationModule');
registerQuotationRoutes(app);

if (require.main === module) {
  const port = process.env.PORT || 4000;
  app.listen(port, '0.0.0.0', () => {
    console.log('Server running');
  });
}

module.exports = app;
