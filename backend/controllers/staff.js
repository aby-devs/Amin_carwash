const { admin, service_db } = require('../configs/firebase_db');

// Get staff commission data for a specific date
exports.get_staff_commission = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Get all records for the specified date
    const snapshot = await service_db.collection('records')
      .where('date', '==', date)
      .orderBy('date', 'desc')
      .get();

    const records = [];
    snapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Calculate commission data
    const totalServices = records.filter(r => r.status === 'completed').length;
    const totalRevenue = records.filter(r => r.amountPaid > 0).reduce((sum, record) => sum + record.amountPaid, 0);

    // Get unique staff members
    const uniqueStaff = [...new Set(records.map(record => record.attendant))];
    const totalStaff = uniqueStaff.length;

    // Calculate individual staff commission breakdown with dynamic commission rates
    const staffBreakdown = uniqueStaff.map(attendant => {
      const attendantRecords = records.filter(r => r.attendant === attendant);
      const attendantRevenue = attendantRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0);
      
      // Commission calculation: 20% if < 5000, 30% if >= 5000
      const commissionRate = attendantRevenue < 5000 ? 0.20 : 0.30;
      const attendantCommission = attendantRevenue * commissionRate;
      
      return {
        attendant,
        services: attendantRecords.length,
        revenue: attendantRevenue,
        commission: attendantCommission,
        commissionRate: commissionRate * 100, // Store as percentage
        averageService: attendantRecords.length > 0 ? attendantRevenue / attendantRecords.length : 0
      };
    }).sort((a, b) => b.commission - a.commission);

    // Calculate total commission based on individual staff commissions
    const totalCommission = staffBreakdown.reduce((sum, staff) => sum + staff.commission, 0);

    // Calculate average commission rate
    const averageCommissionRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;

    res.status(200).json({
      success: true,
      message: 'Staff commission data retrieved successfully',
      data: {
        date: date,
        totalStaff,
        totalServices,
        totalRevenue,
        totalCommission,
        commissionRate: averageCommissionRate, // Average commission rate
        staffBreakdown
      }
    });

  } catch (error) {
    console.error('Error getting staff commission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get staff commission summary (all time or date range)
exports.get_staff_summary = async (req, res) => {
  try {
    const { startDate, endDate, period = 'all' } = req.query;
    
    let query = service_db.collection('records');
    let filteredRecords = [];

    if (period === 'all' || (!startDate && !endDate)) {
      // Get all records
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      snapshot.forEach(doc => {
        filteredRecords.push({
          id: doc.id,
          ...doc.data()
        });
      });
    } else if (startDate && endDate) {
      // Date range filtering
      const snapshot = await query
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'desc')
        .get();
      
      snapshot.forEach(doc => {
        filteredRecords.push({
          id: doc.id,
          ...doc.data()
        });
      });
    } else {
      // Single date filtering
      const targetDate = startDate || endDate;
      
      const snapshot = await query
        .where('date', '==', targetDate)
        .orderBy('date', 'desc')
        .get();
      
      snapshot.forEach(doc => {
        filteredRecords.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }

    // Calculate summary statistics
    const totalServices = filteredRecords.filter(r => r.status === 'completed').length;
    const totalRevenue = filteredRecords.filter(r => r.amountPaid > 0).reduce((sum, record) => sum + record.amountPaid, 0);
    const uniqueStaff = [...new Set(filteredRecords.map(record => record.attendant))];

    // Top performing staff with dynamic commission rates
    const staffPerformance = uniqueStaff.map(attendant => {
      const attendantRecords = filteredRecords.filter(r => r.attendant === attendant);
      const attendantRevenue = attendantRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0);
      
      // Commission calculation: 20% if < 5000, 30% if >= 5000
      const commissionRate = attendantRevenue < 5000 ? 0.20 : 0.30;
      const attendantCommission = attendantRevenue * commissionRate;
      
      return {
        attendant,
        services: attendantRecords.length,
        revenue: attendantRevenue,
        commission: attendantCommission,
        commissionRate: commissionRate * 100, // Store as percentage
        averageService: attendantRecords.length > 0 ? attendantRevenue / attendantRecords.length : 0
      };
    }).sort((a, b) => b.commission - a.commission);

    // Calculate total commission based on individual staff commissions
    const totalCommission = staffPerformance.reduce((sum, staff) => sum + staff.commission, 0);
    const averageCommissionRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;

    res.status(200).json({
      success: true,
      message: 'Staff summary retrieved successfully',
      data: {
        period: period,
        dateRange: startDate && endDate ? { startDate, endDate } : null,
        totalStaff: uniqueStaff.length,
        totalServices,
        totalRevenue,
        totalCommission,
        commissionRate: averageCommissionRate,
        topPerformers: staffPerformance.slice(0, 5), // Top 5 performers
        staffPerformance
      }
    });

  } catch (error) {
    console.error('Error getting staff summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
