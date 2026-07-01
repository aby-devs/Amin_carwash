const express = require('express');
const router = express.Router();
const { CarWashRecords } = require('../controllers');
const { verifyToken, requireManager } = require('../middleware/auth');

// Car wash records routes
router.get('/test', CarWashRecords.test_records);
router.post('/', CarWashRecords.add_record);
router.get('/', CarWashRecords.get_records);
router.get('/search', CarWashRecords.search_records);
router.get('/dashboard', CarWashRecords.get_dashboard_stats);
router.get('/debug/all-ids', CarWashRecords.debug_all_ids);
router.post('/:recordId/commission', CarWashRecords.calculate_and_save_commission);
router.get('/commissions', CarWashRecords.get_commissions);
router.post('/commissions/cleanup-duplicates', CarWashRecords.cleanup_duplicate_commissions);
router.delete('/commissions/:commissionId', verifyToken, requireManager, CarWashRecords.delete_commission);
router.get('/:id', CarWashRecords.get_record);
router.put('/:id', CarWashRecords.update_record);
router.delete('/:id', verifyToken, requireManager, CarWashRecords.delete_record);

module.exports = router;
