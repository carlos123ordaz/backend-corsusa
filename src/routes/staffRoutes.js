// routes/staffRoutes.js
const { Router } = require('express');
const {
    getStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
} = require('../controllers/staffController');

const router = Router();

router.get('/', getStaff);
router.post('/', createStaff);
router.get('/:id', getStaffById);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

module.exports = router;