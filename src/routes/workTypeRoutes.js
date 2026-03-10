const express = require('express');
const router = express.Router();
const workTypeController = require('../controllers/workTypeController');

router.get('/', workTypeController.getAllWorkTypes);
router.get('/:code', workTypeController.getWorkTypeByCode);
router.post('/', workTypeController.createWorkType);
router.put('/:code', workTypeController.updateWorkType);
router.delete('/:code', workTypeController.deleteWorkType);

module.exports = router;