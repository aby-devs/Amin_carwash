const express = require('express');
const router = express.Router();
const { Staff } = require('../controllers');

// Staff commission routes
router.get('/commission', Staff.get_staff_commission);
router.get('/summary', Staff.get_staff_summary);

module.exports = router;
