// routes/configRoutes.js
const { Router } = require('express');
const {
    getDropdownOptions,
    updateDropdownOptions,
    getGlobalSettings,
    updateGlobalSettings,
} = require('../controllers/configController');

const router = Router();

router.get('/dropdown-options', getDropdownOptions);
router.put('/dropdown-options', updateDropdownOptions);

router.get('/global-settings', getGlobalSettings);
router.put('/global-settings', updateGlobalSettings);

module.exports = router;