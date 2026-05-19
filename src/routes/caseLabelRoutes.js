const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/caseLabelController');

router.get('/month/:month/:year/:areaId', ctrl.getByMonth);
router.get('/search', ctrl.searchCaseNumbers);

router.post('/',      ctrl.create);
router.post('/clear', ctrl.clearRange);

router.put('/:id', ctrl.update);

router.delete('/:id', ctrl.remove);

module.exports = router;
