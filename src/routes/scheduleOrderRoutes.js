const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getOrder, saveOrder } = require('../controllers/scheduleOrderController');

router.get('/',  auth, getOrder);
router.put('/',  auth, saveOrder);

module.exports = router;
