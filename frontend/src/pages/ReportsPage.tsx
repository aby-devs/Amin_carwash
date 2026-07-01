import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CarWashRecord } from "@/components/CarWashRecord";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Car, 
  CreditCard, 
  Filter,
  Download,
  RefreshCw,
  Calendar,
  FileText,
  PieChart,
  BarChart3,
  Target,
  Wallet,
  Percent,
  Activity,
  Clock,
  Award
} from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  totalVehicles: number;
  totalRecords: number;
  totalCommissions: number;
  totalProfit: number;
  profitMargin: number;
  averageOrderValue: number;
  dailyAverage: number;
  monthlyProjection: number;
  hourlyRevenue: {
    hour: number;
    revenue: number;
    vehicles: number;
  }[];
  attendantStats: {
    name: string;
    vehicleCount: number;
    revenue: number;
    commission: number;
    commissionRate: number;
    profit: number;
    efficiency: number;
  }[];
  serviceStats: {
    service: string;
    vehicleType: string;
    count: number;
    revenue: number;
    profit: number;
    profitMargin: number;
  }[];
  paymentMethodStats: {
    method: string;
    count: number;
    revenue: number;
    percentage: number;
    averageTransaction: number;
  }[];
  topAttendant: {
    name: string;
    vehicleCount: number;
    profit: number;
  };
  leastAttendant: {
    name: string;
    vehicleCount: number;
    profit: number;
  };
  highestCommissionAttendant: {
    name: string;
    commission: number;
  };
  lowestCommissionAttendant: {
    name: string;
    commission: number;
  };
  topService: {
    service: string;
    vehicleType: string;
    revenue: number;
    profit: number;
  };
  leastService: {
    service: string;
    vehicleType: string;
    revenue: number;
    profit: number;
  };
  businessMetrics: {
    customerRetention: number;
    peakHours: string;
    slowHours: string;
    revenueGrowth: number;
    profitGrowth: number;
  };
}

export function ReportsPage() {
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Filter states
  const [filters, setFilters] = useState({
    dateRange: 'full',
    selectedMonth: (new Date().getMonth() + 1).toString(), // Current month (1-12)
    selectedWeek: 'all',
    selectedDay: ''
  });

  // Get current year for month selection
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, [filters]); // Reload data when filters change

  // Function to calculate date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // If specific day is selected
    if (filters.selectedDay) {
      return {
        startDate: filters.selectedDay,
        endDate: filters.selectedDay
      };
    }
    
    // If specific week is selected
    if (filters.selectedWeek && filters.selectedWeek !== 'all') {
      const [year, week] = filters.selectedWeek.split('-W');
      const startOfWeek = new Date(parseInt(year), 0, 1);
      const dayOfWeek = startOfWeek.getDay();
      const daysToAdd = (parseInt(week) - 1) * 7 - dayOfWeek + 1;
      startOfWeek.setDate(startOfWeek.getDate() + daysToAdd);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      };
    }
    
    // If specific month is selected - always use current year
    if (filters.selectedMonth && filters.selectedMonth !== 'all') {
        const month = parseInt(filters.selectedMonth);
        // Use UTC to avoid timezone issues
        const startOfMonth = new Date(Date.UTC(currentYear, month - 1, 1));
        const endOfMonth = new Date(Date.UTC(currentYear, month, 0)); // Last day of the selected month
        endOfMonth.setUTCHours(23, 59, 59, 999); // Include the full last day
      
        const dateRange = {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0]
        };
        
        
        return dateRange;
      }
      
    
    
    // Default to full report
    return {
      startDate: '',
      endDate: ''
    };
  };

  // Function to get display name for date range
  const getDateRangeDisplayName = () => {
    if (filters.selectedDay) {
      const date = new Date(filters.selectedDay);
      return `Day: ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    }
    
    if (filters.selectedWeek && filters.selectedWeek !== 'all') {
      const [year, week] = filters.selectedWeek.split('-W');
      return `Week ${week}, ${year}`;
    }
    
    if (filters.selectedMonth && filters.selectedMonth !== 'all') {
      const month = parseInt(filters.selectedMonth);
      const monthName = new Date(currentYear, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
      return `${monthName} ${currentYear}`;
    }
    
    return 'Full Report (All Time)';
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get date range based on selected period
      const dateRange = getDateRange();
      
      // Prepare API parameters
      const apiParams: any = { limit: 1000 };
      
      if (dateRange.startDate) apiParams.startDate = dateRange.startDate;
      if (dateRange.endDate) apiParams.endDate = dateRange.endDate;
      
      const response = await apiService.getRecords(apiParams);
      
      if (response.success && response.data) {
        
        setRecords(response.data);
        calculateAnalytics(response.data);
      } else {
        throw new Error(response.message || 'Failed to load records');
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast({
        title: "Error Loading Data",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (data: CarWashRecord[]) => {
    // Filter for only completed records (status: 'completed') - exclude pending payments
    const filteredData = data.filter(record => record.status === 'completed');

    // Calculate attendant statistics
    const attendantMap = new Map();
    const serviceMap = new Map();
    const paymentMap = new Map();
    const hourlyMap = new Map();

    filteredData.forEach(record => {
      // Attendant stats
      const attendant = record.attendant;
      if (!attendantMap.has(attendant)) {
        attendantMap.set(attendant, {
          name: attendant,
          vehicleCount: 0,
          revenue: 0,
          commission: 0,
          commissionRate: 0,
          profit: 0,
          efficiency: 0
        });
      }
      
      const attendantData = attendantMap.get(attendant);
      attendantData.vehicleCount++;
      attendantData.revenue += record.amountPaid;
      
      // Service stats
      const serviceKey = `${record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services)} - ${record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : 'Unknown')}`;
      if (!serviceMap.has(serviceKey)) {
        serviceMap.set(serviceKey, {
          service: record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services),
          vehicleType: record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : 'Unknown'),
          count: 0,
          revenue: 0,
          profit: 0,
          profitMargin: 0
        });
      }
      
      const serviceData = serviceMap.get(serviceKey);
      serviceData.count++;
      serviceData.revenue += record.amountPaid;
      
      // Payment method stats
      const paymentMethod = record.paymentMethod;
      if (!paymentMap.has(paymentMethod)) {
        paymentMap.set(paymentMethod, {
          method: paymentMethod,
          count: 0,
          revenue: 0,
          percentage: 0,
          averageTransaction: 0
        });
      }
      
      const paymentData = paymentMap.get(paymentMethod);
      paymentData.count++;
      paymentData.revenue += record.amountPaid;

      // Hourly revenue tracking
      const time = record.time || '00:00';
      const hour = parseInt(time.split(':')[0]);
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, { hour, revenue: 0, vehicles: 0 });
      }
      const hourlyData = hourlyMap.get(hour);
      hourlyData.revenue += record.amountPaid;
      hourlyData.vehicles += 1;
    });

    // Calculate commissions and profits for attendants
    attendantMap.forEach(attendant => {
      const commissionRate = attendant.revenue < 6000 ? 0.20 : 0.30;
      attendant.commission = attendant.revenue * commissionRate;
      attendant.commissionRate = commissionRate;
      attendant.profit = attendant.revenue - attendant.commission;
      attendant.efficiency = attendant.vehicleCount > 0 ? attendant.revenue / attendant.vehicleCount : 0;
    });

    // Calculate profits and margins for services
    serviceMap.forEach(service => {
      // Estimate service cost (you can adjust these based on actual costs)
      const estimatedCost = service.revenue * 0.15; // 15% of revenue as cost
      service.profit = service.revenue - estimatedCost;
      service.profitMargin = service.revenue > 0 ? (service.profit / service.revenue) * 100 : 0;
    });

    // Calculate payment method percentages and averages
    const totalRecords = filteredData.length;
    paymentMap.forEach(payment => {
      payment.percentage = totalRecords > 0 ? (payment.count / totalRecords) * 100 : 0;
      payment.averageTransaction = payment.count > 0 ? payment.revenue / payment.count : 0;
    });

    // Sort and find extremes
    const attendantStats = Array.from(attendantMap.values()).sort((a, b) => b.vehicleCount - a.vehicleCount);
    const serviceStats = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);
    const paymentMethodStats = Array.from(paymentMap.values()).sort((a, b) => b.count - a.count);
    const hourlyRevenue = Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour);

    const totalRevenue = filteredData.reduce((sum, record) => sum + record.amountPaid, 0);
    const totalCommissions = attendantStats.reduce((sum, attendant) => sum + attendant.commission, 0);
    const totalProfit = totalRevenue - totalCommissions;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageOrderValue = totalRecords > 0 ? totalRevenue / totalRecords : 0;

    // Calculate business metrics
    const dateRange = getDateRange();
    const daysInRange = dateRange.startDate && dateRange.endDate ? 
      Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 
      30; // Default to 30 days if no specific range
    
    const dailyAverage = daysInRange > 0 ? totalRevenue / daysInRange : 0;
    const monthlyProjection = dailyAverage * 30;

    // Find peak and slow hours
    const peakHourData = hourlyRevenue.reduce((max, hour) => hour.revenue > max.revenue ? hour : max, { hour: 0, revenue: 0, vehicles: 0 });
    const slowHourData = hourlyRevenue.reduce((min, hour) => hour.revenue < min.revenue ? hour : min, { hour: 0, revenue: 0, vehicles: 0 });
    
    const peakHours = `${peakHourData.hour}:00 - ${peakHourData.hour + 1}:00`;
    const slowHours = `${slowHourData.hour}:00 - ${slowHourData.hour + 1}:00`;

    setAnalytics({
      totalRevenue,
      totalVehicles: filteredData.length,
      totalRecords: filteredData.length,
      totalCommissions,
      totalProfit,
      profitMargin,
      averageOrderValue,
      dailyAverage,
      monthlyProjection,
      hourlyRevenue,
      attendantStats,
      serviceStats,
      paymentMethodStats,
      topAttendant: attendantStats[0] ? { name: attendantStats[0].name, vehicleCount: attendantStats[0].vehicleCount, profit: attendantStats[0].profit } : { name: 'N/A', vehicleCount: 0, profit: 0 },
      leastAttendant: attendantStats[attendantStats.length - 1] ? { name: attendantStats[attendantStats.length - 1].name, vehicleCount: attendantStats[attendantStats.length - 1].vehicleCount, profit: attendantStats[attendantStats.length - 1].profit } : { name: 'N/A', vehicleCount: 0, profit: 0 },
      highestCommissionAttendant: attendantStats.sort((a, b) => b.commission - a.commission)[0] || { name: 'N/A', commission: 0 },
      lowestCommissionAttendant: attendantStats.sort((a, b) => a.commission - b.commission)[0] || { name: 'N/A', commission: 0 },
      topService: serviceStats[0] ? { service: serviceStats[0].service, vehicleType: serviceStats[0].vehicleType, revenue: serviceStats[0].revenue, profit: serviceStats[0].profit } : { service: 'N/A', vehicleType: 'N/A', revenue: 0, profit: 0 },
      leastService: serviceStats[serviceStats.length - 1] ? { service: serviceStats[serviceStats.length - 1].service, vehicleType: serviceStats[serviceStats.length - 1].vehicleType, revenue: serviceStats[serviceStats.length - 1].revenue, profit: serviceStats[serviceStats.length - 1].profit } : { service: 'N/A', vehicleType: 'N/A', revenue: 0, profit: 0 },
      businessMetrics: {
        customerRetention: 85, // Placeholder - could be calculated from repeat customers
        peakHours,
        slowHours,
        revenueGrowth: 12.5, // Placeholder - could be calculated from previous period
        profitGrowth: 8.3 // Placeholder - could be calculated from previous period
      }
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadData();
  };

  const clearFilters = () => {
    setFilters({
      dateRange: 'full',
      selectedMonth: (new Date().getMonth() + 1).toString(), // Current month
      selectedWeek: 'all',
      selectedDay: ''
    });
    loadData();
  };

  const exportData = () => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for export
      const exportRecords = records.map(record => ({
        'Date': record.date,
        'Registration Number': record.registrationNumber,
        'Car Model': record.carModel,
        'Vehicle Type': record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : '-'),
        'Service Offered': record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services),
        'Amount Paid (KSh)': record.amountPaid,
        'Payment Method': record.paymentMethod,
        'Attendant': record.attendant,
        'M-Pesa Code': record.mpesaCode || '-',
        'Time': record.time || '-',
      }));

      // Create the main data worksheet
      const dataWorksheet = XLSX.utils.json_to_sheet(exportRecords);
      
      // Set column widths
      const columnWidths = [
        { wch: 12 }, // Date
        { wch: 15 }, // Registration Number
        { wch: 20 }, // Car Model
        { wch: 15 }, // Vehicle Type
        { wch: 25 }, // Service Offered
        { wch: 15 }, // Amount Paid
        { wch: 12 }, // Payment Method
        { wch: 15 }, // Attendant
        { wch: 15 }, // M-Pesa Code
        { wch: 10 }  // Time
      ];
      dataWorksheet['!cols'] = columnWidths;

      // Add the data worksheet
      XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Car Wash Records');

      // Create summary data
      const summaryData = [];
      
      if (analytics) {
        // Header
        summaryData.push(['CAR WASH MANAGEMENT SYSTEM - ANALYTICS SUMMARY']);
        summaryData.push(['Generated on:', new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })]);
        summaryData.push(['Period:', getDateRangeDisplayName()]);
        summaryData.push([]); // Empty row

        // Key Metrics
        summaryData.push(['KEY PERFORMANCE INDICATORS']);
        summaryData.push(['Total Revenue (KSh)', analytics.totalRevenue.toLocaleString()]);
        summaryData.push(['Net Profit (KSh)', analytics.totalProfit.toLocaleString()]);
        summaryData.push(['Profit Margin (%)', analytics.profitMargin.toFixed(2)]);
        summaryData.push(['Total Vehicles Washed', analytics.totalVehicles]);
        summaryData.push(['Total Records', analytics.totalRecords]);
        summaryData.push(['Active Attendants', analytics.attendantStats.length]);
        summaryData.push(['Total Commissions Paid (KSh)', analytics.totalCommissions.toLocaleString()]);
        summaryData.push(['Average Revenue per Vehicle (KSh)', analytics.averageOrderValue.toLocaleString()]);
        summaryData.push(['Daily Average Revenue (KSh)', analytics.dailyAverage.toLocaleString()]);
        summaryData.push(['Monthly Projection (KSh)', analytics.monthlyProjection.toLocaleString()]);
        summaryData.push([]); // Empty row

        // Top Performers
        summaryData.push(['TOP PERFORMING ATTENDANTS']);
        summaryData.push(['Rank', 'Attendant', 'Services', 'Revenue (KSh)', 'Profit (KSh)', 'Commission (KSh)', 'Commission Rate (%)']);
        analytics.attendantStats.slice(0, 5).forEach((attendant, index) => {
          summaryData.push([
            index + 1,
            attendant.name,
            attendant.vehicleCount,
            attendant.revenue.toLocaleString(),
            attendant.profit.toLocaleString(),
            attendant.commission.toLocaleString(),
            Math.round(attendant.commissionRate * 100)
          ]);
        });
        summaryData.push([]); // Empty row

        // Payment Method Analysis
        summaryData.push(['PAYMENT METHOD ANALYSIS']);
        summaryData.push(['Payment Method', 'Transactions', 'Revenue (KSh)', 'Avg Transaction (KSh)', 'Percentage (%)']);
        analytics.paymentMethodStats.forEach(payment => {
          summaryData.push([
            payment.method,
            payment.count,
            payment.revenue.toLocaleString(),
            payment.averageTransaction.toLocaleString(),
            payment.percentage.toFixed(1)
          ]);
        });
        summaryData.push([]); // Empty row

        // Service Performance
        summaryData.push(['SERVICE PERFORMANCE']);
        summaryData.push(['Service', 'Vehicle Type', 'Count', 'Revenue (KSh)', 'Profit (KSh)', 'Profit Margin (%)']);
        analytics.serviceStats.slice(0, 10).forEach(service => {
          summaryData.push([
            service.service,
            service.vehicleType,
            service.count,
            service.revenue.toLocaleString(),
            service.profit.toLocaleString(),
            service.profitMargin.toFixed(2)
          ]);
        });
      }

      // Create summary worksheet
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths for summary
      summaryWorksheet['!cols'] = [
        { wch: 20 }, // First column
        { wch: 25 }, // Second column
        { wch: 15 }, // Third column
        { wch: 15 }  // Fourth column
      ];

      // Add the summary worksheet
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary & Analytics');

      // Create a detailed metrics worksheet for better readability
      const metricsData = [];
      
      if (analytics) {
        // Header
        metricsData.push(['DETAILED BUSINESS METRICS']);
        metricsData.push(['Generated on:', new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })]);
        metricsData.push(['Period:', getDateRangeDisplayName()]);
        metricsData.push([]); // Empty row

        // Financial Overview
        metricsData.push(['FINANCIAL OVERVIEW']);
        metricsData.push(['Metric', 'Value (KSh)', 'Percentage']);
        metricsData.push(['Total Revenue', analytics.totalRevenue.toLocaleString(), '100%']);
        metricsData.push(['Total Commissions', analytics.totalCommissions.toLocaleString(), `${((analytics.totalCommissions / analytics.totalRevenue) * 100).toFixed(1)}%`]);
        metricsData.push(['Net Profit', analytics.totalProfit.toLocaleString(), `${analytics.profitMargin.toFixed(1)}%`]);
        metricsData.push([]); // Empty row

        // Business Metrics
        metricsData.push(['BUSINESS METRICS']);
        metricsData.push(['Metric', 'Value']);
        metricsData.push(['Total Vehicles', analytics.totalVehicles]);
        metricsData.push(['Total Records', analytics.totalRecords]);
        metricsData.push(['Average Order Value', analytics.averageOrderValue.toLocaleString()]);
        metricsData.push(['Daily Average', analytics.dailyAverage.toLocaleString()]);
        metricsData.push(['Monthly Projection', analytics.monthlyProjection.toLocaleString()]);
        metricsData.push(['Active Attendants', analytics.attendantStats.length]);
        metricsData.push([]); // Empty row

        // Staff Performance
        metricsData.push(['STAFF PERFORMANCE DETAILS']);
        metricsData.push(['Rank', 'Name', 'Vehicles', 'Revenue', 'Commission', 'Profit', 'Commission Rate']);
        analytics.attendantStats.forEach((attendant, index) => {
          metricsData.push([
            index + 1,
            attendant.name,
            attendant.vehicleCount,
            attendant.revenue.toLocaleString(),
            attendant.commission.toLocaleString(),
            attendant.profit.toLocaleString(),
            `${Math.round(attendant.commissionRate * 100)}%`
          ]);
        });
        metricsData.push([]); // Empty row

        // Service Performance
        metricsData.push(['SERVICE PERFORMANCE DETAILS']);
        metricsData.push(['Service', 'Vehicle Type', 'Count', 'Revenue', 'Profit', 'Margin %']);
        analytics.serviceStats.forEach(service => {
          metricsData.push([
            service.service,
            service.vehicleType,
            service.count,
            service.revenue.toLocaleString(),
            service.profit.toLocaleString(),
            `${service.profitMargin.toFixed(1)}%`
          ]);
        });
      }

      // Create metrics worksheet
      const metricsWorksheet = XLSX.utils.aoa_to_sheet(metricsData);
      
      // Set column widths for metrics
      metricsWorksheet['!cols'] = [
        { wch: 25 }, // First column
        { wch: 20 }, // Second column
        { wch: 15 }, // Third column
        { wch: 15 }  // Fourth column
      ];

      // Add the metrics worksheet
      XLSX.utils.book_append_sheet(workbook, metricsWorksheet, 'Business Metrics');

      // Generate filename
      const filename = `car-wash-report-${getDateRangeDisplayName().replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write the file
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Excel Export Successful",
        description: "Data exported with 3 sheets: Records, Summary, and Business Metrics",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Excel Export Failed",
        description: "Could not generate Excel file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);
      
      // Create a new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Helper function to add text with word wrapping
      const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };

      // Helper function to add a line
      const addLine = (y: number) => {
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, y, pageWidth - 20, y);
        return y + 5;
      };

      // Helper function to add a section header
      const addSectionHeader = (title: string, y: number) => {
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        y = addText(title, 20, y, pageWidth - 40, 16);
        y = addLine(y);
        return y + 5;
      };

      // Helper function to add a metric
      const addMetric = (label: string, value: string, y: number) => {
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(100, 100, 100);
        y = addText(label, 20, y, pageWidth - 40, 10);
        
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        y = addText(value, 20, y + 3, pageWidth - 40, 12);
        return y + 8;
      };

      // Header
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      yPosition = addText('Car Wash Management System', 20, yPosition, pageWidth - 40, 20);
      
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100, 100, 100);
      yPosition = addText('Analytics & Reports', 20, yPosition + 5, pageWidth - 40, 14);
      
      pdf.setFontSize(10);
      yPosition = addText(`Generated on: ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 20, yPosition + 3, pageWidth - 40, 10);
      
      yPosition = addText(`Period: ${getDateRangeDisplayName()}`, 20, yPosition + 3, pageWidth - 40, 10);
      
      yPosition = addLine(yPosition + 5);

      // Key Metrics Section
      if (analytics) {
        yPosition = addSectionHeader('Key Performance Indicators', yPosition);
        
        yPosition = addMetric('Total Revenue', `KSh ${analytics.totalRevenue.toLocaleString()}`, yPosition);
        yPosition = addMetric('Net Profit', `KSh ${analytics.totalProfit.toLocaleString()}`, yPosition);
        yPosition = addMetric('Profit Margin', `${analytics.profitMargin.toFixed(2)}%`, yPosition);
        yPosition = addMetric('Total Vehicles Washed', analytics.totalVehicles.toString(), yPosition);
        yPosition = addMetric('Total Records', analytics.totalRecords.toString(), yPosition);
        yPosition = addMetric('Total Commissions Paid', `KSh ${analytics.totalCommissions.toLocaleString()}`, yPosition);
        yPosition = addMetric('Average Revenue per Vehicle', `KSh ${analytics.averageOrderValue.toLocaleString()}`, yPosition);
        yPosition = addMetric('Daily Average Revenue', `KSh ${analytics.dailyAverage.toLocaleString()}`, yPosition);
        yPosition = addMetric('Monthly Projection', `KSh ${analytics.monthlyProjection.toLocaleString()}`, yPosition);
        
        yPosition = addLine(yPosition + 5);
      }

      // Top Performers Section
      if (analytics && (analytics as any).topPerformers && (analytics as any).topPerformers.length > 0) {
        yPosition = addSectionHeader('Top Performers', yPosition);
        
        (analytics as any).topPerformers.forEach((performer: any, index: number) => {
          yPosition = addMetric(
            `${index + 1}. ${performer.name}`,
            `${performer.vehicles} vehicles • KSh ${performer.revenue.toLocaleString()} • ${performer.commissionRate}% commission`,
            yPosition
          );
        });
        
        yPosition = addLine(yPosition + 5);
      }

      // Service Analysis Section
      if (analytics && (analytics as any).serviceAnalysis && (analytics as any).serviceAnalysis.length > 0) {
        yPosition = addSectionHeader('Service Performance Analysis', yPosition);
        
        (analytics as any).serviceAnalysis.forEach((service: any, index: number) => {
          yPosition = addMetric(
            `${index + 1}. ${service.name}`,
            `${service.count} services • KSh ${service.revenue.toLocaleString()} • ${service.percentage.toFixed(1)}% of total`,
            yPosition
          );
        });
        
        yPosition = addLine(yPosition + 5);
      }

      // Payment Method Analysis
      if (analytics && (analytics as any).paymentAnalysis && (analytics as any).paymentAnalysis.length > 0) {
        yPosition = addSectionHeader('Payment Method Analysis', yPosition);
        
        (analytics as any).paymentAnalysis.forEach((payment: any, index: number) => {
          yPosition = addMetric(
            `${index + 1}. ${payment.method}`,
            `${payment.count} transactions • KSh ${payment.amount.toLocaleString()} • ${payment.percentage.toFixed(1)}% of total`,
            yPosition
          );
        });
        
        yPosition = addLine(yPosition + 5);
      }

      // Recent Records Section (if there's space)
      if (records.length > 0 && yPosition < pageHeight - 100) {
        yPosition = addSectionHeader('Recent Records (Sample)', yPosition);
        
        const sampleRecords = records.slice(0, 10); // Show first 10 records
        sampleRecords.forEach((record, index) => {
          const vehicleType = record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : '-');
          const service = record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services);
          
          yPosition = addMetric(
            `${index + 1}. ${record.registrationNumber}`,
            `${vehicleType} • ${service} • KSh ${record.amountPaid.toLocaleString()} • ${record.attendant}`,
            yPosition
          );
        });
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text('Generated by Car Wash Management System', 20, pageHeight - 10);
      pdf.text(`Page 1 of 1`, pageWidth - 30, pageHeight - 10);

      // Save the PDF
      const fileName = `car-wash-analysis-${getDateRangeDisplayName().replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "PDF Export Successful",
        description: "Analysis exported as PDF file",
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Export Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
  return (
    <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-sm sm:text-base text-gray-600">Comprehensive analysis of your car wash business</p>
          <p className="text-xs sm:text-sm text-blue-600 font-medium mt-1">
            📅 {getDateRangeDisplayName()}
          </p>
        </div>
        <div className="flex space-x-1 sm:space-x-2">
          <Button onClick={exportData} variant="outline" size="sm" className="text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" disabled={loading} className="text-xs sm:text-sm">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button onClick={loadData} variant="outline" size="sm" className="text-xs sm:text-sm">
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </Button>
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Select Time Period
          </CardTitle>
          <CardDescription>Choose specific days or months to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month Selection */}
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={filters.selectedMonth} onValueChange={(value) => {
                setFilters(prev => ({ ...prev, selectedMonth: value, selectedWeek: 'all', selectedDay: '' }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(currentYear, i, 1);
                    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                    return (
                      <SelectItem key={i} value={String(i + 1)}>
                        {monthName} {currentYear}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Day Selection */}
            <div>
              <Label htmlFor="day">Day</Label>
              <Input
                id="day"
                type="date"
                value={filters.selectedDay}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, selectedDay: e.target.value, selectedMonth: 'all', selectedWeek: 'all' }));
                }}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={clearFilters} variant="outline">
              Clear Selection
            </Button>
            <Button onClick={() => setFilters(prev => ({ ...prev, selectedMonth: (new Date().getMonth() + 1).toString(), selectedWeek: 'all', selectedDay: '' }))}>
              Current Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-green-50">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-green-600">
              KSh {analytics?.totalRevenue.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              📈 +{analytics?.businessMetrics.revenueGrowth || 0}% from last period
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-blue-50">
              <Wallet className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-blue-600">
              KSh {analytics?.totalProfit.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              📊 {analytics?.profitMargin.toFixed(1) || 0}% profit margin
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Total Vehicles
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-purple-50">
              <Car className="h-3 w-3 md:h-4 md:w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-purple-600">
              {analytics?.totalVehicles || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              🚗 Vehicles washed this period
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Avg. Order Value
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-orange-50">
              <Target className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-orange-600">
              KSh {analytics?.averageOrderValue.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              💰 Revenue per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Daily Average
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-indigo-50">
              <Activity className="h-3 w-3 md:h-4 md:w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-xl font-bold text-indigo-600">
              KSh {analytics?.dailyAverage.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              📅 Per day average
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Monthly Projection
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-teal-50">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-xl font-bold text-teal-600">
              KSh {analytics?.monthlyProjection.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              📊 30-day forecast
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Total Commissions
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-red-50">
              <Percent className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-xl font-bold text-red-600">
              KSh {analytics?.totalCommissions.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              👥 Staff payments
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Peak Hours
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-yellow-50">
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-xl font-bold text-yellow-600">
              {analytics?.businessMetrics.peakHours || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ⏰ Highest activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Attendant Performance */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Staff Performance Analysis
            </CardTitle>
            <CardDescription>Revenue, profit, and efficiency metrics by attendant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
                <Award className="h-4 w-4 md:h-6 md:w-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-medium">Top Performer</p>
                <p className="font-bold text-green-600 text-sm md:text-base">{analytics?.topAttendant.name}</p>
                <p className="text-xs md:text-sm text-gray-500">{analytics?.topAttendant.vehicleCount} vehicles</p>
                <p className="text-xs text-green-600 font-medium">Profit: KSh {analytics?.topAttendant.profit.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 md:p-4 bg-red-50 rounded-lg border border-red-200">
                <TrendingDown className="h-4 w-4 md:h-6 md:w-6 text-red-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-medium">Needs Improvement</p>
                <p className="font-bold text-red-600 text-sm md:text-base">{analytics?.leastAttendant.name}</p>
                <p className="text-xs md:text-sm text-gray-500">{analytics?.leastAttendant.vehicleCount} vehicles</p>
                <p className="text-xs text-red-600 font-medium">Profit: KSh {analytics?.leastAttendant.profit.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Wallet className="h-4 w-4 md:h-6 md:w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-medium">Highest Commission</p>
                <p className="font-bold text-blue-600 text-sm md:text-base">{analytics?.highestCommissionAttendant.name}</p>
                <p className="text-xs md:text-sm text-gray-500">KSh {analytics?.highestCommissionAttendant.commission.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 md:p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Percent className="h-4 w-4 md:h-6 md:w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-medium">Lowest Commission</p>
                <p className="font-bold text-orange-600 text-sm md:text-base">{analytics?.lowestCommissionAttendant.name}</p>
                <p className="text-xs md:text-sm text-gray-500">KSh {analytics?.lowestCommissionAttendant.commission.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Performance */}
        <Card className="border-l-4 border-l-teal-500">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Car className="h-5 w-5 mr-2 text-teal-600" />
              Service Profitability Analysis
            </CardTitle>
            <CardDescription>Revenue and profit analysis by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
                <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-medium">Most Profitable</p>
                <p className="font-bold text-green-600 text-sm md:text-base">{analytics?.topService.service}</p>
                <p className="text-xs md:text-sm text-gray-500">{analytics?.topService.vehicleType}</p>
                <p className="text-xs md:text-sm text-green-600 font-medium">Revenue: KSh {analytics?.topService.revenue.toLocaleString()}</p>
                <p className="text-xs text-green-600 font-medium">Profit: KSh {analytics?.topService.profit.toLocaleString()}</p>
              </div>
              
              <div className="text-center p-3 md:p-4 bg-red-50 rounded-lg border border-red-200">
                <TrendingDown className="h-4 w-4 md:h-6 md:w-6 text-red-600 mx-auto mb-2" />
                <p className="text-xs md:text-sm text-gray-600 font-medium">Least Profitable</p>
                <p className="font-bold text-red-600 text-sm md:text-base">{analytics?.leastService.service}</p>
                <p className="text-xs md:text-sm text-gray-500">{analytics?.leastService.vehicleType}</p>
                <p className="text-xs md:text-sm text-red-600 font-medium">Revenue: KSh {analytics?.leastService.revenue.toLocaleString()}</p>
                <p className="text-xs text-red-600 font-medium">Profit: KSh {analytics?.leastService.profit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Attendant Details */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Staff Performance Breakdown
            </CardTitle>
            <CardDescription>Detailed revenue, profit, and efficiency metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.attendantStats.slice(0, 5).map((attendant, index) => (
                <div key={attendant.name} className="border border-blue-200 rounded-lg p-3 md:p-4 bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs md:text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm md:text-base">{attendant.name}</p>
                        <p className="text-xs md:text-sm text-gray-500">{attendant.vehicleCount} vehicles</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Revenue</p>
                      <p className="font-bold text-green-600 text-sm md:text-base">KSh {attendant.revenue.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Profit</p>
                      <p className="font-bold text-blue-600 text-sm md:text-base">KSh {attendant.profit.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Commission</p>
                      <p className="font-bold text-purple-600 text-sm md:text-base">KSh {attendant.commission.toLocaleString()}</p>
                      <Badge variant={attendant.commissionRate === 0.30 ? "default" : "secondary"} className="text-xs mt-1">
                        {Math.round(attendant.commissionRate * 100)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Analysis */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-green-600" />
              Payment Method Analysis
            </CardTitle>
            <CardDescription>Transaction volume and average values by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.paymentMethodStats.map((payment, index) => (
                <div key={payment.method} className="border border-green-200 rounded-lg p-3 md:p-4 bg-green-50/30 hover:bg-green-50/50 transition-colors">
                  <div className="flex items-center space-x-2 md:space-x-3 mb-3">
                    <div className="p-1.5 md:p-2 bg-green-50 rounded-lg">
                      <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 text-sm md:text-base">{payment.method}</span>
                      <p className="text-xs md:text-sm text-gray-500">{payment.count} transactions</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Total Revenue</p>
                      <p className="font-bold text-green-600 text-sm md:text-base">KSh {payment.revenue.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Avg Transaction</p>
                      <p className="font-bold text-blue-600 text-sm md:text-base">KSh {payment.averageTransaction.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Percentage</p>
                      <p className="font-bold text-purple-600 text-sm md:text-base">{payment.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Details */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
            Service Profitability Analysis
          </CardTitle>
          <CardDescription>Revenue, profit, and margin analysis by service type</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="block md:hidden">
            <div className="space-y-3">
              {analytics?.serviceStats.slice(0, 10).map((service, index) => (
                <div key={index} className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/30 hover:bg-indigo-50/50 transition-colors">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600">{index + 1}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{service.service}</span>
                      <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        {service.vehicleType}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Count</p>
                      <p className="font-bold text-indigo-600 text-sm">{service.count}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Revenue</p>
                      <p className="font-bold text-green-600 text-sm">KSh {service.revenue.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Profit</p>
                      <p className="font-bold text-blue-600 text-sm">KSh {service.profit.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">Margin</p>
                      <Badge 
                        variant={service.profitMargin > 80 ? "default" : service.profitMargin > 60 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {service.profitMargin.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-semibold text-gray-700">Service</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Vehicle Type</th>
                  <th className="text-right p-4 font-semibold text-gray-700">Count</th>
                  <th className="text-right p-4 font-semibold text-gray-700">Revenue</th>
                  <th className="text-right p-4 font-semibold text-gray-700">Profit</th>
                  <th className="text-right p-4 font-semibold text-gray-700">Margin</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.serviceStats.slice(0, 10).map((service, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-600">{index + 1}</span>
                        </div>
                        <span className="font-medium text-gray-900">{service.service}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {service.vehicleType}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-medium">{service.count}</td>
                    <td className="p-4 text-right">
                      <span className="font-medium text-green-600">KSh {service.revenue.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium text-blue-600">KSh {service.profit.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right">
                      <Badge 
                        variant={service.profitMargin > 80 ? "default" : service.profitMargin > 60 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {service.profitMargin.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}