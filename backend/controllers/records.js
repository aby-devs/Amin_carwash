const { admin, service_db, firebaseErrorResponse } = require('../configs/firebase_db');

// Test endpoint to verify backend is working
exports.test_records = async (req, res) => {
  try {
    
    // Get all records without any filtering
    const snapshot = await service_db.collection('records').limit(5).get();
    const records = [];
    
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      success: true,
      message: 'Test endpoint working',
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  }
};

// Helper function to generate service order ID
const generateServiceOrderId = async () => {
  const currentYear = new Date().getFullYear();
  const recordsRef = service_db.collection('records');
  
  // Get all records for the current year by querying createdAt field
  const startOfYear = new Date(currentYear, 0, 1); // January 1st
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999); // December 31st
  
  const snapshot = await recordsRef
    .where('createdAt', '>=', startOfYear)
    .where('createdAt', '<=', endOfYear)
    .get();
  
  const count = snapshot.size + 1;
  const baseId = `SO-${currentYear}-${count.toString().padStart(3, '0')}`;
  
  // Check if ID already exists and generate a unique one
  let uniqueId = baseId;
  let counter = 1;
  
  while (true) {
    const existingDoc = await recordsRef.doc(uniqueId).get();
    if (!existingDoc.exists) {
      break; // ID is unique
    }
    // ID exists, try with a suffix
    uniqueId = `${baseId}-${counter.toString().padStart(2, '0')}`;
    counter++;
  }
  
  return uniqueId;
};

// Add a new car wash record
exports.add_record = async (req, res) => {
  try {
    const {
      registrationNumber,
      carModel,
      vehicleType,
      services,
      amountPaid,
      paymentMethod,
      attendant,
      mpesaCode,
      date,
      supervisorAccount,
      supervisorName
    } = req.body;



    // Validate required fields
    if (!registrationNumber || !carModel || !services || !attendant) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate M-Pesa code if payment method is M-Pesa and amountPaid > 0
    if (paymentMethod === 'Mpesa' && amountPaid > 0 && !mpesaCode) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa transaction code is required for M-Pesa payments'
      });
    }

    // Generate service order ID
    const serviceOrderId = await generateServiceOrderId();

    // Create record data
    const now = new Date();
    const finalDate = date || now.toISOString().split('T')[0];
    
    const recordData = {
      id: serviceOrderId,
      registrationNumber: registrationNumber.trim().toUpperCase(),
      carModel: carModel.trim(),
      vehicleType: vehicleType || '', // Store vehicle type
      services: services.trim(),
      serviceOffered: services.trim(), // Also store serviceOffered for compatibility
      amountPaid: amountPaid ? parseFloat(amountPaid) : 0,
      paymentMethod: paymentMethod || 'Cash', // Default to Cash if not provided
      attendant: attendant.trim(),
      date: finalDate, // Use provided date or current date in YYYY-MM-DD format
      time: now.toLocaleTimeString(),
      status: req.body.status || 'active', // Always create as active (pending) regardless of amount
      supervisorAccount: supervisorAccount || 'unknown',
      supervisorName: supervisorName || 'unknown',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add M-Pesa code if provided
    if (paymentMethod === 'Mpesa' && mpesaCode) {
      recordData.mpesaCode = mpesaCode.trim().toUpperCase();
    }

    // Save to Firestore using the service order ID as the document ID
    const docRef = await service_db.collection('records').doc(serviceOrderId).set(recordData);

    // Emit real-time update via Socket.io
    const socketService = req.app.get('socketService');
    if (socketService) {
      const newRecord = {
        id: serviceOrderId,
        ...recordData
      };
      socketService.emitRecordAdded(newRecord);
    }

    // Commission calculation will be handled when record is updated to completed status
    // This prevents duplicate commission records

    res.status(201).json({
      success: true,
      message: 'Car wash record added successfully',
      data: {
        id: serviceOrderId,
        ...recordData
      }
    });

  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all car wash records with optional filtering
exports.get_records = async (req, res) => {
  const { paymentMethod, attendant, startDate, endDate, limit = 100 } = req.query;

  try {
    // Firestore requires a composite index when combining date range filters
    // with orderBy on a different field. Fetch ordered results and filter in memory.
    const snapshot = await service_db.collection('records')
      .orderBy('createdAt', 'desc')
      .get();

    let records = [];

    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    if (startDate) {
      records = records.filter(record => record.date >= startDate);
    }

    if (endDate) {
      records = records.filter(record => record.date <= endDate);
    }

    if (paymentMethod && paymentMethod !== 'All') {
      records = records.filter(record => record.paymentMethod === paymentMethod);
    }

    if (attendant) {
      records = records.filter(record => record.attendant === attendant);
    }

    records = records.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Records retrieved successfully',
      data: records,
      count: records.length
    });

  } catch (error) {
    console.error('Error getting records:', error);
    console.error('Query parameters:', { paymentMethod, attendant, startDate, endDate, limit });
    const { status, message, error: detail } = firebaseErrorResponse(error);
    res.status(status).json({
      success: false,
      message,
      error: detail,
    });
  }
};

// Get a single record by ID
exports.get_record = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await service_db.collection('records').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Record retrieved successfully',
      data: {
        id: doc.id,
        ...doc.data()
      }
    });

  } catch (error) {
    console.error('Error getting record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update a car wash record
exports.update_record = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;

    // Add updated timestamp
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Validate M-Pesa code if payment method is M-Pesa
    if (updateData.paymentMethod === 'Mpesa' && !updateData.mpesaCode) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa transaction code is required for M-Pesa payments'
      });
    }

    // Update the record
    await service_db.collection('records').doc(id).update(updateData);

    // Get the updated record
    const updatedDoc = await service_db.collection('records').doc(id).get();
    const updatedRecord = updatedDoc.data();

    // If record is being updated to completed status with payment, calculate commission
    if (updateData.status === 'completed' && updateData.amountPaid > 0) {
      try {
        // Check if commission already exists for this record
        const existingCommissionSnapshot = await service_db.collection('commissions')
          .where('recordId', '==', id)
          .get();

        // Only create commission if it doesn't exist
        if (existingCommissionSnapshot.empty) {
          // Get all completed records for this attendant on this date to calculate daily revenue
          const attendantRecordsSnapshot = await service_db.collection('records')
            .where('attendant', '==', updatedRecord.attendant)
            .where('date', '==', updatedRecord.date)
            .where('status', '==', 'completed')
            .get();
          
          // Calculate daily revenue (including the current record being updated)
          let dailyRevenue = 0;
          attendantRecordsSnapshot.forEach(doc => {
            const record = doc.data();
            if (record.recordId !== id) { // Exclude the current record to avoid double counting
              dailyRevenue += record.amountPaid;
            }
          });
          dailyRevenue += updatedRecord.amountPaid; // Add the current record's amount
          
          // Determine commission rate based on daily revenue
          const commissionRate = dailyRevenue >= 6000 ? 30 : 20;
          const commissionAmount = (updatedRecord.amountPaid * commissionRate) / 100;
          
          const commissionData = {
            recordId: id,
            attendant: updatedRecord.attendant,
            registrationNumber: updatedRecord.registrationNumber,
            carModel: updatedRecord.carModel,
            vehicleType: updatedRecord.vehicleType,
            services: updatedRecord.services,
            serviceOffered: updatedRecord.serviceOffered,
            amountPaid: updatedRecord.amountPaid,
            commissionAmount: commissionAmount,
            commissionRate: commissionRate,
            dailyRevenue: dailyRevenue,
            date: updatedRecord.date,
            time: updatedRecord.time,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          await service_db.collection('commissions').add(commissionData);
        } else {
        }
      } catch (commissionError) {
        console.error('Error saving commission on update:', commissionError);
        // Don't fail the update if commission fails
      }
    }

    // Emit real-time update via Socket.io
    const socketService = req.app.get('socketService');
    if (socketService) {
      const updatedRecord = {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };
      socketService.emitRecordUpdated(updatedRecord);
    }

    res.status(200).json({
      success: true,
      message: 'Record updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });

  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Debug function to list all record IDs
exports.debug_all_ids = async (req, res) => {
  try {
    const allRecordsSnapshot = await service_db.collection('records').get();
    const records = [];
    
    allRecordsSnapshot.forEach(doc => {
      records.push({
        id: doc.id,
        registrationNumber: doc.data().registrationNumber,
        createdAt: doc.data().createdAt
      });
    });
    
    
    res.status(200).json({
      success: true,
      message: 'All record IDs retrieved',
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error('Error getting all record IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Calculate and save commission for a record
exports.calculate_and_save_commission = async (req, res) => {
  try {
    const { recordId } = req.params;
    
    
    // Get the record
    const recordDoc = await service_db.collection('records').doc(recordId).get();
    
    if (!recordDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }
    
    const record = recordDoc.data();
    
    // Get all records for this attendant on this date to calculate daily revenue
    const attendantRecordsSnapshot = await service_db.collection('records')
      .where('attendant', '==', record.attendant)
      .where('date', '==', record.date)
      .get();
    
    // Calculate daily revenue
    let dailyRevenue = 0;
    attendantRecordsSnapshot.forEach(doc => {
      const rec = doc.data();
      dailyRevenue += rec.amountPaid;
    });
    
    // Determine commission rate based on daily revenue
    const commissionRate = dailyRevenue >= 6000 ? 30 : 20;
    const commissionAmount = (record.amountPaid * commissionRate) / 100;
    
    
    // Create commission record
    const commissionData = {
      recordId: recordId,
      attendant: record.attendant,
      registrationNumber: record.registrationNumber,
      carModel: record.carModel,
      vehicleType: record.vehicleType,
      services: record.services,
      serviceOffered: record.serviceOffered,
      amountPaid: record.amountPaid,
      commissionAmount: commissionAmount,
      commissionRate: commissionRate,
      dailyRevenue: dailyRevenue, // Store daily revenue for reference
      date: record.date,
      time: record.time,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save commission to Firestore
    const commissionRef = await service_db.collection('commissions').add(commissionData);
    
    
    res.status(201).json({
      success: true,
      message: 'Commission calculated and saved successfully',
      data: {
        commissionId: commissionRef.id,
        ...commissionData
      }
    });
    
  } catch (error) {
    console.error('Error calculating commission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get commissions with optional filtering
exports.get_commissions = async (req, res) => {
  try {
    const { attendant, startDate, endDate, limit = 100 } = req.query;
    
    
    let query = service_db.collection('commissions');
    
    // Apply filters
    if (attendant) {
      query = query.where('attendant', '==', attendant);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      query = query.where('createdAt', '>=', start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.where('createdAt', '<=', end);
    }
    
    // Order by creation date (newest first) and limit
    query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));
    
    const snapshot = await query.get();
    let commissions = [];
    
    snapshot.forEach(doc => {
      commissions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    
    res.status(200).json({
      success: true,
      message: 'Commissions retrieved successfully',
      data: commissions,
      count: commissions.length
    });
    
  } catch (error) {
    console.error('Error getting commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete a commission record
exports.delete_commission = async (req, res) => {
  try {
    const { commissionId } = req.params;
    

    // Check if commission exists
    const commissionDoc = await service_db.collection('commissions').doc(commissionId).get();
    
    if (!commissionDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Commission not found'
      });
    }

    // Delete the commission record
    await service_db.collection('commissions').doc(commissionId).delete();
    
    
    res.status(200).json({
      success: true,
      message: 'Commission deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting commission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete a car wash record
exports.delete_record = async (req, res) => {
  try {
    const { id } = req.params;
    

    // Debug: List all existing record IDs
    const allRecordsSnapshot = await service_db.collection('records').get();
    const existingIds = [];
    allRecordsSnapshot.forEach(doc => {
      existingIds.push(doc.id);
    });

    const doc = await service_db.collection('records').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    await service_db.collection('records').doc(id).delete();

    // Emit real-time update via Socket.io
    const socketService = req.app.get('socketService');
    if (socketService) {
      socketService.emitRecordDeleted(id);
    }

    res.status(200).json({
      success: true,
      message: 'Record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get dashboard analytics
exports.get_dashboard_stats = async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    // Get all records first, then filter by date on the server side
    // This is more reliable than Firestore date queries
    const snapshot = await service_db.collection('records')
      .orderBy('createdAt', 'desc')
      .get();
    
    const allRecords = [];
    snapshot.forEach(doc => {
      allRecords.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Filter records based on period
    const now = new Date();
    let filteredRecords = allRecords;

    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      filteredRecords = allRecords.filter(record => {
        let recordDate;
        if (record.createdAt && record.createdAt.toDate) {
          recordDate = record.createdAt.toDate();
        } else if (record.createdAt && record.createdAt._seconds) {
          recordDate = new Date(record.createdAt._seconds * 1000);
        } else {
          recordDate = new Date(record.date);
        }
        return recordDate >= startOfDay && recordDate <= endOfDay;
      });
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      filteredRecords = allRecords.filter(record => {
        let recordDate;
        if (record.createdAt && record.createdAt.toDate) {
          recordDate = record.createdAt.toDate();
        } else if (record.createdAt && record.createdAt._seconds) {
          recordDate = new Date(record.createdAt._seconds * 1000);
        } else {
          recordDate = new Date(record.date);
        }
        return recordDate >= startOfWeek;
      });
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      filteredRecords = allRecords.filter(record => {
        let recordDate;
        if (record.createdAt && record.createdAt.toDate) {
          recordDate = record.createdAt.toDate();
        } else if (record.createdAt && record.createdAt._seconds) {
          recordDate = new Date(record.createdAt._seconds * 1000);
        } else {
          recordDate = new Date(record.date);
        }
        return recordDate >= startOfMonth;
      });
    }

    const records = filteredRecords;

    // Calculate statistics
    const totalRevenue = records.filter(r => r.status === 'completed').reduce((sum, record) => sum + record.amountPaid, 0);
    const totalServices = records.filter(r => r.status === 'completed').length;
    const pendingServices = records.filter(r => r.status === 'active' || !r.status).length;
    const uniqueAttendants = [...new Set(records.map(record => record.attendant))];
    const averageService = totalServices > 0 ? totalRevenue / totalServices : 0;

    // Payment method breakdown - only count completed payments
    const mpesaRecords = records.filter(r => r.paymentMethod === 'Mpesa' && r.status === 'completed');
    const cashRecords = records.filter(r => r.paymentMethod === 'Cash' && r.status === 'completed');
    const mpesaRevenue = mpesaRecords.reduce((sum, record) => sum + record.amountPaid, 0);
    const cashRevenue = cashRecords.reduce((sum, record) => sum + record.amountPaid, 0);

    // Staff performance
    const staffPerformance = uniqueAttendants.map(attendant => {
      const attendantRecords = records.filter(r => r.attendant === attendant);
      const completedRecords = attendantRecords.filter(r => r.status === 'completed');
      const attendantRevenue = completedRecords.reduce((sum, r) => sum + r.amountPaid, 0);
      
      // Calculate commission (20% if < 5000, 30% if >= 5000)
      const commissionRate = attendantRevenue < 5000 ? 0.20 : 0.30;
      const commission = attendantRevenue * commissionRate;
      
      return {
        attendant,
        services: completedRecords.length, // Only count completed services
        revenue: attendantRevenue,
        commission: commission,
        averageService: completedRecords.length > 0 ? attendantRevenue / completedRecords.length : 0
      };
    }).sort((a, b) => b.commission - a.commission);

    // Recent records (last 5)
    const recentRecords = records
      .sort((a, b) => new Date(b.createdAt?.toDate?.() || b.date) - new Date(a.createdAt?.toDate?.() || a.date))
      .slice(0, 5);

    res.status(200).json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: {
        totalRevenue,
        totalServices,
        pendingServices,
        uniqueAttendants: uniqueAttendants.length,
        averageService,
        paymentBreakdown: {
          mpesa: {
            count: mpesaRecords.length,
            revenue: mpesaRevenue
          },
          cash: {
            count: cashRecords.length,
            revenue: cashRevenue
          }
        },
        staffPerformance,
        recentRecords
      }
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    const { status, message, error: detail } = firebaseErrorResponse(error);
    res.status(status).json({
      success: false,
      message,
      error: detail,
    });
  }
};

// Clean up duplicate commission records
exports.cleanup_duplicate_commissions = async (req, res) => {
  try {
    
    // Get all commission records
    const commissionsSnapshot = await service_db.collection('commissions').get();
    const commissions = [];
    const recordIdMap = new Map();
    
    commissionsSnapshot.forEach(doc => {
      const data = doc.data();
      commissions.push({
        id: doc.id,
        ...data
      });
      
      // Track commission records by recordId
      if (!recordIdMap.has(data.recordId)) {
        recordIdMap.set(data.recordId, []);
      }
      recordIdMap.get(data.recordId).push({
        id: doc.id,
        ...data
      });
    });
    
    // Find duplicates and remove them
    let duplicatesRemoved = 0;
    const duplicateRecordIds = [];
    
    for (const [recordId, commissionList] of recordIdMap.entries()) {
      if (commissionList.length > 1) {
        duplicateRecordIds.push(recordId);
        
        // Sort by creation date (keep the oldest one)
        commissionList.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt?._seconds * 1000) || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt?._seconds * 1000) || new Date(0);
          return aTime - bTime;
        });
        
        // Remove all but the first (oldest) commission
        for (let i = 1; i < commissionList.length; i++) {
          await service_db.collection('commissions').doc(commissionList[i].id).delete();
          duplicatesRemoved++;
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Cleanup completed. Removed ${duplicatesRemoved} duplicate commission records.`,
      data: {
        totalCommissions: commissions.length,
        duplicatesRemoved,
        affectedRecordIds: duplicateRecordIds
      }
    });
    
  } catch (error) {
    console.error('Error cleaning up duplicate commissions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


// Search records
exports.search_records = async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchTerm = q.trim().toLowerCase();
    
    // Get all records and filter client-side for now
    // In production, you might want to use Algolia or similar for better search
    const snapshot = await service_db.collection('records')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit) * 2) // Get more records to filter
      .get();

    const records = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const searchableText = [
        data.registrationNumber,
        data.carModel,
        data.attendant,
        data.id,
        data.services
      ].join(' ').toLowerCase();

      if (searchableText.includes(searchTerm)) {
        records.push({
          id: doc.id,
          ...data
        });
      }
    });

    // Limit results
    const limitedRecords = records.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: limitedRecords,
      count: limitedRecords.length,
      query: searchTerm
    });

  } catch (error) {
    console.error('Error searching records:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
