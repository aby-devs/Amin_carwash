import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Calendar,
  User,
  CreditCard,
  Eye,
  X,
  Search,
  Filter,
  Trash2,
  Download,
  Loader2,
  BarChart3,
  Wallet
} from "lucide-react";
import { apiService, StaffCommissionData } from "@/services/api";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

const BASE_URL = API_BASE_URL || window.location.origin;

export function StaffPage() {
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [allCommissions, setAllCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<string | null>(null);
  const [attendantRecords, setAttendantRecords] = useState<any[]>([]);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [deletingCommissionId, setDeletingCommissionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [commissionFilter, setCommissionFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState(() => {
    // Use East Africa Time (EAT, UTC+3)
    const today = new Date();
    const eatOffset = 3 * 60; // 3 hours in minutes
    const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
    const eatTime = new Date(utc + (eatOffset * 60000));
    
    const year = eatTime.getFullYear();
    const month = String(eatTime.getMonth() + 1).padStart(2, '0');
    const day = String(eatTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const { toast } = useToast();


  const loadAllRecords = async () => {
    setLoading(true);
    try {
      // Load all records to calculate commission data
      const response = await apiService.getRecords({ limit: 1000 });
      if (response.success && response.data) {
        setAllRecords(response.data);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load records",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading records:', error);
      toast({
        title: "Error",
        description: "Failed to load records. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllCommissions = async () => {
    setCommissionsLoading(true);
    try {
      // Load all commissions from Firestore
      const response = await apiService.getCommissions({ limit: 1000 });
      if (response.success && response.data) {
        setAllCommissions(response.data);
      } else {
        console.error('Failed to load commissions:', response.message);
        setAllCommissions([]);
      }
    } catch (error) {
      console.error('Error loading commissions:', error);
      setAllCommissions([]);
    } finally {
      setCommissionsLoading(false);
    }
  };

  // Load all records and commissions on component mount
  useEffect(() => {
    loadAllRecords();
    loadAllCommissions();
  }, []);


  // Listen for record added events to refresh commission data
  useEffect(() => {
    const handleRecordAdded = (event: CustomEvent) => {
      // Refresh commission data when a new record is added
      loadAllCommissions();
    };

    window.addEventListener('recordAdded', handleRecordAdded as EventListener);
    
    return () => {
      window.removeEventListener('recordAdded', handleRecordAdded as EventListener);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`;
  };

  const getEATDateString = () => {
    const today = new Date();
    const eatOffset = 3 * 60; // 3 hours in minutes
    const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
    const eatTime = new Date(utc + (eatOffset * 60000));
    
    const year = eatTime.getFullYear();
    const month = String(eatTime.getMonth() + 1).padStart(2, '0');
    const day = String(eatTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateShort = (dateString: string) => {
    try {
      // Convert from YYYY-MM-DD to DD/MM/YY
      const [year, month, day] = dateString.split('-');
      const shortYear = year.slice(-2); // Get last 2 digits of year
      return `${day}/${month}/${shortYear}`;
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  // Function to get color theme for different attendants
  const getAttendantColor = (attendantName: string) => {
    const colors = [
      { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: 'bg-blue-100' },
      { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', accent: 'bg-green-100' },
      { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', accent: 'bg-purple-100' },
      { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', accent: 'bg-orange-100' },
      { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', accent: 'bg-pink-100' },
      { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', accent: 'bg-teal-100' },
      { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', accent: 'bg-indigo-100' },
      { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', accent: 'bg-red-100' }
    ];
    
    // Simple hash function to consistently assign colors to attendants
    let hash = 0;
    for (let i = 0; i < attendantName.length; i++) {
      hash = attendantName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const formatCurrencyMobile = (amount: number) => {
    if (amount >= 1000) {
      return `KSh ${(amount / 1000).toFixed(1)}K`;
    }
    return `KSh ${amount}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate commission data from Firestore commission records
  const calculateCommissionData = () => {
    const staffMap = new Map();
    let totalRevenue = 0;
    let totalServices = 0;
    let totalCommission = 0;

    // Return empty data if no commissions are loaded yet
    if (!allCommissions || allCommissions.length === 0) {
      return {
        totalStaff: 0,
        totalRevenue: 0,
        totalServices: 0,
        totalCommission: 0,
        commissionRate: 0,
        commissionRateRange: 'No data',
        staffBreakdown: []
      };
    }

    // Filter commissions by date if dateFilter is set
    let commissionsToProcess = allCommissions;
    if (dateFilter) {
      commissionsToProcess = allCommissions.filter(commission => {
        try {
          // Handle different date formats
          const commissionDate = commission.date;
          if (!commissionDate) return false;
          
          // If it's already in YYYY-MM-DD format, direct comparison
          if (commissionDate === dateFilter) return true;
          
          // If it's a timestamp, convert to YYYY-MM-DD
          if (commissionDate.toDate) {
            const date = commissionDate.toDate();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            return formattedDate === dateFilter;
          }
          
          // If it's a string date, try to parse it
          const parsedDate = new Date(commissionDate);
          if (!isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            return formattedDate === dateFilter;
          }
          
          return false;
        } catch (error) {
          console.error('Date parsing error:', error);
          return false; // If date parsing fails, exclude the commission
        }
      });
    }


    // Group commissions by date and staff member to calculate individual daily revenue
    const commissionsByDateAndStaff = new Map();
    commissionsToProcess.forEach(commission => {
      const key = `${commission.date}-${commission.attendant}`;
      if (!commissionsByDateAndStaff.has(key)) {
        commissionsByDateAndStaff.set(key, []);
      }
      commissionsByDateAndStaff.get(key).push(commission);
    });

    // Calculate daily revenue for each staff member on each date and recalculate commission rates
    const updatedCommissions = [];
    commissionsByDateAndStaff.forEach((staffDayCommissions, key) => {
      const dailyRevenue = staffDayCommissions.reduce((sum, c) => sum + c.amountPaid, 0);
      const correctCommissionRate = dailyRevenue >= 6000 ? 30 : 20;
      
      
      staffDayCommissions.forEach(commission => {
        // Recalculate commission with correct rate based on individual staff daily revenue
        const correctCommissionAmount = (commission.amountPaid * correctCommissionRate) / 100;
        
        updatedCommissions.push({
          ...commission,
          commissionRate: correctCommissionRate,
          commissionAmount: correctCommissionAmount
        });
      });
    });

    updatedCommissions.forEach(commission => {
      totalRevenue += commission.amountPaid;
      totalServices += 1;
      totalCommission += commission.commissionAmount;

      const attendant = commission.attendant;
      if (!staffMap.has(attendant)) {
        staffMap.set(attendant, {
          attendant,
          services: 0,
          revenue: 0,
          commission: 0,
          averageService: 0
        });
      }

      const staffData = staffMap.get(attendant);
      staffData.services += 1;
      staffData.revenue += commission.amountPaid;
      staffData.commission += commission.commissionAmount;
      // Store commission rates for this staff member
      if (!staffData.commissionRates) staffData.commissionRates = [];
      staffData.commissionRates.push(commission.commissionRate);
    });

    // Calculate average service and commission rate for each staff member
    staffMap.forEach(staff => {
      staff.averageService = staff.services > 0 ? staff.revenue / staff.services : 0;
      // Calculate average commission rate for this staff member
      if (staff.commissionRates && staff.commissionRates.length > 0) {
        staff.averageCommissionRate = staff.commissionRates.reduce((sum, rate) => sum + rate, 0) / staff.commissionRates.length;
        staff.commissionRateRange = Math.min(...staff.commissionRates) !== Math.max(...staff.commissionRates) 
          ? `${Math.min(...staff.commissionRates)}% - ${Math.max(...staff.commissionRates)}%`
          : `${staff.commissionRates[0]}%`;
        
      } else {
        staff.averageCommissionRate = 0;
        staff.commissionRateRange = '0%';
      }
    });

    const staffBreakdown = Array.from(staffMap.values()).sort((a, b) => b.commission - a.commission);
    
    // Calculate commission rate information using updated commissions
    const commissionRates = updatedCommissions.map(c => c.commissionRate);
    const minRate = commissionRates.length > 0 ? Math.min(...commissionRates) : 0;
    const maxRate = commissionRates.length > 0 ? Math.max(...commissionRates) : 0;
    const avgRate = commissionRates.length > 0 ? commissionRates.reduce((sum, rate) => sum + rate, 0) / commissionRates.length : 0;


    return {
      totalStaff: staffMap.size,
      totalRevenue,
      totalServices,
      totalCommission,
      commissionRate: avgRate, // Use average rate for display
      commissionRateRange: commissionRates.length > 0 ? (minRate !== maxRate ? `${minRate}% - ${maxRate}%` : `${avgRate}%`) : 'No data',
      staffBreakdown,
      updatedCommissions // Include updated commissions for individual record display
    };
  };

  const commissionData = calculateCommissionData();
  const isLoading = loading || commissionsLoading;

  const handleViewRecords = async (attendant: string) => {
    setSelectedAttendant(attendant);
    setShowRecordsModal(true);
    setLoadingRecords(true);
    
    try {
      // Get the latest commission data and recalculate rates
      const commissionData = calculateCommissionData();
      let attendantCommissions = commissionData.updatedCommissions.filter(commission => commission.attendant === attendant);
      
      // Apply date filter if set
      if (dateFilter) {
        attendantCommissions = attendantCommissions.filter(commission => {
          try {
            // Direct comparison since both are now in YYYY-MM-DD format
            return commission.date === dateFilter;
          } catch (error) {
            return true;
          }
        });
      }
      
      
      setAttendantRecords(attendantCommissions);
    } catch (error) {
      console.error('Error loading attendant commission records:', error);
      toast({
        title: "Error",
        description: "Failed to load attendant commission records",
        variant: "destructive",
      });
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleDeleteCommission = async (commissionId: string, recordId: string) => {
    setDeletingCommissionId(commissionId);
    try {
      // First delete the commission record
      const commissionResponse = await apiService.deleteCommission(commissionId);
      if (!commissionResponse.success) {
        throw new Error(commissionResponse.message || 'Failed to delete commission');
      }

      // Then delete the associated service record
      const recordResponse = await apiService.deleteRecord(recordId);
      if (!recordResponse.success) {
        throw new Error(recordResponse.message || 'Failed to delete service record');
      }

      toast({
        title: "Success",
        description: "Commission and service record deleted successfully",
      });

      // Refresh both records and commissions
      await Promise.all([loadAllRecords(), loadAllCommissions()]);

    } catch (error) {
      console.error('Error deleting commission:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete commission",
        variant: "destructive",
      });
    } finally {
      setDeletingCommissionId(null);
    }
  };

  const exportCommissionsToExcel = async () => {
    try {
      // Get all commissions for the current month
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Get start and end dates for current month
      const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`;

      // Fetch all commissions for the month
      const response = await apiService.getCommissions({
        startDate: startOfMonth,
        endDate: endOfMonth,
        limit: 1000
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch commission data');
      }

      const monthlyCommissions = response.data;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Prepare commission data
      const commissionData = monthlyCommissions.map((commission: any, index: number) => ({
        'No.': index + 1,
        'Date': formatDateShort(commission.date),
        'Staff Member': commission.attendant,
        'Registration Number': commission.registrationNumber,
        'Service Amount (KSh)': commission.amountPaid,
        'Commission Rate (%)': Math.round(commission.commissionRate),
        'Commission Amount (KSh)': commission.commissionAmount,
        'Daily Revenue (KSh)': commission.dailyRevenue
      }));

      // Create commission worksheet
      const commissionWorksheet = XLSX.utils.json_to_sheet(commissionData);
      
      // Set column widths
      commissionWorksheet['!cols'] = [
        { wch: 5 },  // No.
        { wch: 12 }, // Date
        { wch: 20 }, // Staff Member
        { wch: 18 }, // Registration Number
        { wch: 18 }, // Service Amount
        { wch: 15 }, // Commission Rate
        { wch: 18 }, // Commission Amount
        { wch: 18 }  // Daily Revenue
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, commissionWorksheet, 'Staff Commissions');

      // Create summary data
      const summaryData = [];
      
      // Header
      summaryData.push(['STAFF COMMISSION SUMMARY']);
      summaryData.push(['Generated on:', new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })]);
      summaryData.push(['Period:', `${new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', { month: 'long' })} ${currentYear}`]);
      summaryData.push([]); // Empty row

      // Summary metrics
      const totalCommissionAmount = monthlyCommissions.reduce((sum: number, c: any) => sum + c.commissionAmount, 0);
      const totalServiceAmount = monthlyCommissions.reduce((sum: number, c: any) => sum + c.amountPaid, 0);
      const uniqueStaff = [...new Set(monthlyCommissions.map((c: any) => c.attendant))].length;
      const averageCommission = monthlyCommissions.length > 0 ? totalCommissionAmount / monthlyCommissions.length : 0;

      summaryData.push(['MONTHLY SUMMARY']);
      summaryData.push(['Metric', 'Value']);
      summaryData.push(['Total Commission Payments (KSh)', totalCommissionAmount.toLocaleString()]);
      summaryData.push(['Total Service Revenue (KSh)', totalServiceAmount.toLocaleString()]);
      summaryData.push(['Number of Commission Records', monthlyCommissions.length]);
      summaryData.push(['Active Staff Members', uniqueStaff]);
      summaryData.push(['Average Commission per Record (KSh)', averageCommission.toLocaleString()]);
      summaryData.push([]); // Empty row

      // Staff breakdown
      const staffMap = new Map();
      monthlyCommissions.forEach((commission: any) => {
        if (!staffMap.has(commission.attendant)) {
          staffMap.set(commission.attendant, {
            name: commission.attendant,
            totalCommission: 0,
            totalRevenue: 0,
            recordCount: 0
          });
        }
        const staff = staffMap.get(commission.attendant);
        staff.totalCommission += commission.commissionAmount;
        staff.totalRevenue += commission.amountPaid;
        staff.recordCount += 1;
      });

      const staffStats = Array.from(staffMap.values()).sort((a, b) => b.totalCommission - a.totalCommission);

      summaryData.push(['STAFF PERFORMANCE BREAKDOWN']);
      summaryData.push(['Staff Member', 'Records', 'Total Revenue (KSh)', 'Total Commission (KSh)', 'Avg Commission Rate (%)']);
      staffStats.forEach(staff => {
        // Calculate average commission rate based on individual commission rates
        const staffCommissions = monthlyCommissions.filter(c => c.attendant === staff.name);
        const avgRate = staffCommissions.length > 0 ? 
          staffCommissions.reduce((sum, c) => sum + c.commissionRate, 0) / staffCommissions.length : 0;
        
        summaryData.push([
          staff.name,
          staff.recordCount,
          staff.totalRevenue.toLocaleString(),
          staff.totalCommission.toLocaleString(),
          avgRate.toFixed(1)
        ]);
      });

      // Create summary worksheet
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths for summary
      summaryWorksheet['!cols'] = [
        { wch: 25 }, // First column
        { wch: 20 }, // Second column
        { wch: 15 }, // Third column
        { wch: 15 }  // Fourth column
      ];

      // Add summary worksheet
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Generate filename
      const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', { month: 'long' });
      const filename = `staff-commissions-${monthName.toLowerCase()}-${currentYear}.xlsx`;

      // Write file
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Excel Export Successful",
        description: `Commission data exported for ${monthName} ${currentYear}`,
      });

    } catch (error) {
      console.error('Error exporting commissions:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Test function to fetch all records for debugging
  const testFetchAllRecords = async () => {
    try {
      
      // Test the backend test endpoint first
      const testResponse = await fetch(`${BASE_URL}/api/records/test`);
      const testData = await testResponse.json();
      
      if (testData.success) {
        toast({
          title: "Backend Test Complete",
          description: `Backend is working! Found ${testData.data?.length || 0} records`,
        });
      } else {
        throw new Error(testData.message);
      }
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Backend Test Failed",
        description: "Backend is not responding properly",
        variant: "destructive",
      });
    }
  };

  // Filter and sort staff data based on search and commission filter
  const filteredStaff = commissionData.staffBreakdown
    .filter(staff => {
      const matchesSearch = staff.attendant.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCommission = commissionFilter === 'All' || 
        (commissionFilter === 'High' && staff.commission >= 2000) ||
        (commissionFilter === 'Medium' && staff.commission >= 1000 && staff.commission < 2000) ||
        (commissionFilter === 'Low' && staff.commission < 1000);
      return matchesSearch && matchesCommission;
    });

  // Create stats array like Dashboard
  const stats = [
    {
      title: "Total Staff",
      value: isLoading ? "" : commissionData.totalStaff.toString(),
      subtitle: "Active staff members",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Total Commission",
      value: isLoading ? "" : formatCurrency(commissionData.totalCommission),
      subtitle: `${commissionData.commissionRate}% of total revenue`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Services",
      value: isLoading ? "" : commissionData.totalServices.toString(),
      subtitle: "Services completed",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Commission Rate",
      value: isLoading ? "" : commissionData.commissionRateRange || `${Math.round(commissionData.commissionRate)}%`,
      subtitle: "Based on daily revenue (20% < KSh 6,000, 30% ≥ KSh 6,000)",
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Staff Commission</h1>
          <p className="text-sm md:text-base text-gray-600">All staff commission transactions and performance tracking</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl md:text-2xl font-bold">
                {isLoading ? (
                  <div className="h-6 md:h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  stat.value
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? (
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  stat.subtitle
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Commission Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Analysis</CardTitle>
          <CardDescription>
            {dateFilter 
              ? `Revenue breakdown for ${new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
              : 'Overall revenue breakdown (all transactions)'
            }
          </CardDescription>
        </CardHeader>
          <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-semibold text-green-800">Total Revenue</p>
                  <p className="text-sm text-green-600">All services completed</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-800 text-lg">{formatCurrency(commissionData.totalRevenue)}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-semibold text-blue-800">Total Commission</p>
                  <p className="text-sm text-blue-600">
                    {commissionData.commissionRateRange || `${Math.round(commissionData.commissionRate)}%`} rate
                    {dateFilter ? ` for ${new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-800 text-lg">{formatCurrency(commissionData.totalCommission)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-semibold text-orange-800">Net Revenue</p>
                  <p className="text-sm text-orange-600">After commission</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-800 text-lg">{formatCurrency(commissionData.totalRevenue - commissionData.totalCommission)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Commission Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Staff Commission Table</CardTitle>
              <CardDescription>
                {dateFilter 
                  ? `Staff commission transactions for ${new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (sorted by highest commission first)`
                  : 'All staff commission transactions (sorted by highest commission first)'
                }
              </CardDescription>
            </div>
            <Button 
              onClick={exportCommissionsToExcel} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Monthly Excel
            </Button>
            
            {/* Daily Book Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">📅</span>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full sm:w-40 h-9 border-2 border-blue-200 focus:border-blue-400"
                  placeholder="Select date"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateFilter(getEATDateString())}
                  className="h-9 px-3 text-xs"
                >
                  Today
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Search className="text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search this day's staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-48 h-9"
                />
              </div>
              <Select value={commissionFilter} onValueChange={setCommissionFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Commission</SelectItem>
                  <SelectItem value="High">High (≥KSh 2,000)</SelectItem>
                  <SelectItem value="Medium">Medium (KSh 1,000-1,999)</SelectItem>
                  <SelectItem value="Low">Low (&lt;KSh 1,000)</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                  setCommissionFilter('All');
                }}
                className="w-full sm:w-auto h-9"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-12 text-gray-500 px-4">
                <div className="text-6xl mb-4">📖</div>
                <div className="text-lg font-semibold mb-2">Clean Staff Commission Table</div>
                <div className="text-sm">
                  No commission records for {dateFilter ? new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'today'} yet.
                </div>
                <div className="text-sm mt-2 text-blue-600">
                  Add services to see commission calculations.
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {/* Show grouped staff data */}
                {filteredStaff.map((staff) => (
                  <div key={staff.attendant} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-lg">{staff.attendant}</div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        staff.averageCommissionRate === 30
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {staff.averageCommissionRate === 30 ? '30%' : '20%'} avg rate
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="font-medium text-blue-800">Services</div>
                        <div className="text-blue-600 font-semibold">{staff.services}</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="font-medium text-green-800">Total Revenue</div>
                        <div className="text-green-600 font-semibold">{formatCurrency(staff.revenue)}</div>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="font-medium text-orange-800">Commission</div>
                        <div className="text-orange-600 font-semibold">{formatCurrency(staff.commission)}</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="font-medium text-purple-800">Avg Service</div>
                        <div className="text-purple-600 font-semibold">{formatCurrency(staff.averageService)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRecords(staff.attendant)}
                        className="h-8 px-3 text-sm"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Staff Member</TableHead>
                    <TableHead className="font-semibold">Registration</TableHead>
                    <TableHead className="font-semibold text-right">Service Amount</TableHead>
                    <TableHead className="font-semibold text-center">Rate</TableHead>
                    <TableHead className="font-semibold text-right">Commission</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="text-6xl mb-4">📖</div>
                        <div className="text-lg font-semibold mb-2">Clean Staff Commission Table</div>
                        <div className="text-sm mb-2">
                          No commission records for {dateFilter ? new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'today'} yet.
                        </div>
                        <div className="text-sm text-blue-600">
                          Add services to see commission calculations.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    // Show grouped staff data (one row per attendant)
                    filteredStaff.map((staff) => (
                      <TableRow key={staff.attendant} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {dateFilter ? formatDateShort(dateFilter) : 'Multiple Dates'}
                        </TableCell>
                        <TableCell className="font-medium">{staff.attendant}</TableCell>
                        <TableCell className="font-medium">{staff.services} services</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(staff.revenue)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            staff.averageCommissionRate === 30
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {staff.averageCommissionRate === 30 ? '30%' : '20%'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(staff.commission)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewRecords(staff.attendant)}
                              className="h-8 px-3 text-xs"
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendant Records Modal */}
      <Dialog open={showRecordsModal} onOpenChange={setShowRecordsModal}>
        <DialogContent className="max-w-sm md:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Commission Records for {selectedAttendant}
            </DialogTitle>
            <DialogDescription>
              Commission breakdown for {selectedAttendant}
              {dateFilter && ` on ${new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
            </DialogDescription>
          </DialogHeader>
          
          {loadingRecords ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading records...</p>
                        </div>
          ) : attendantRecords.length > 0 ? (
            <div className="space-y-4">
              {/* Mobile Card View */}
              <div className="block md:hidden">
                <div className="grid grid-cols-2 gap-3">
                  {attendantRecords.map((commission, index) => {
                    const attendantColors = getAttendantColor(commission.attendant);
                    return (
                      <div key={commission.id || index} className={`border rounded-lg p-3 ${attendantColors.bg} ${attendantColors.border} border-l-4`}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Registration</span>
                            <span className="text-xs font-semibold">{commission.registrationNumber}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Car Model</span>
                            <span className="text-xs">{commission.carModel}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Services</span>
                            <span className="text-xs">{commission.serviceOffered || commission.services}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Amount</span>
                            <span className="text-xs font-semibold">{formatCurrency(commission.amountPaid)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Rate</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              commission.commissionRate === 30 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {commission.commissionRate === 30 ? '30%' : '20%'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Commission</span>
                            <span className="text-xs font-bold text-blue-600">{formatCurrency(commission.commissionAmount)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Date</span>
                            <span className="text-xs text-gray-600">{formatDateShort(commission.date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Registration</th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Car Model</th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Services</th>
                        <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Service Amount</th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Rate</th>
                        <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Commission</th>
                        <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendantRecords.map((commission, index) => (
                        <tr key={commission.id || index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3 font-medium">{commission.registrationNumber}</td>
                          <td className="border border-gray-300 px-4 py-3">{commission.carModel}</td>
                          <td className="border border-gray-300 px-4 py-3">{commission.serviceOffered || commission.services}</td>
                          <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(commission.amountPaid)}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              commission.commissionRate === 30 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {commission.commissionRate === 30 ? '30%' : '20%'}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-right font-semibold text-blue-600">
                            {formatCurrency(commission.commissionAmount)}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-600">
                            {formatDateShort(commission.date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
                      
              {/* Summary */}
              <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-center">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Total Services</p>
                    <p className="text-base md:text-lg font-semibold">{attendantRecords.length}</p>
                        </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Total Revenue</p>
                    <p className="text-base md:text-lg font-semibold text-green-600">
                      {formatCurrency(attendantRecords.reduce((sum, c) => sum + c.amountPaid, 0))}
                        </p>
                      </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-xs md:text-sm text-gray-600">Total Commission</p>
                    <p className="text-base md:text-lg font-semibold text-blue-600">
                      {formatCurrency(attendantRecords.reduce((sum, c) => sum + c.commissionAmount, 0))}
                        </p>
                      </div>
                    </div>
                      </div>
                    </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No commission records found for this attendant{dateFilter ? ' on this date' : ''}.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
