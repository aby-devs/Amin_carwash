import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  DollarSign, 
  Search, 
  Filter, 
  Download,
  Calendar,
  User,
  CreditCard,
  Loader2,
  TrendingUp,
  TrendingDown,
  Car,
  BarChart3,
  PieChart,
  Target,
  Wallet,
  Percent,
  Activity,
  Clock,
  Award,
  RefreshCw,
  FileText
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

export function SupervisorActivitiesPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [paymentFilter, setPaymentFilter] = useState('All');
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user is manager
  if (user?.role !== 'manager') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
              <p className="text-muted-foreground">Only managers can view supervisor activities.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await apiService.getRecords({ limit: 1000 });
      if (response.success && response.data) {
        setRecords(response.data);
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

  useEffect(() => {
    loadRecords();
  }, []);

  // Get unique supervisors by their user accounts (supervisorAccount field)
  const supervisors = [...new Set(records
    .filter(record => record.supervisorAccount)
    .map(record => record.supervisorAccount)
  )].filter(Boolean);

  // Filter records
  const filteredRecords = records.filter(record => {
    const matchesSearch = record.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.carModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.attendant?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSupervisor = supervisorFilter === 'All' || record.supervisorAccount === supervisorFilter;
    const matchesPayment = paymentFilter === 'All' || record.paymentMethod === paymentFilter;
    
    // Date filtering
    let matchesDate = true;
    if (dateFilter) {
      try {
        const recordDate = new Date(record.date);
        const filterDate = new Date(dateFilter);
        matchesDate = recordDate.toDateString() === filterDate.toDateString();
      } catch (error) {
        matchesDate = true;
      }
    }
    
    return matchesSearch && matchesSupervisor && matchesPayment && matchesDate;
  });

  // Calculate supervisor stats by supervisor account
  const supervisorStats = supervisors.map(supervisorAccount => {
    const supervisorRecords = records.filter(r => r.supervisorAccount === supervisorAccount);
    const todayRecords = supervisorRecords.filter(r => {
      try {
        const recordDate = new Date(r.date);
        const today = new Date(dateFilter);
        return recordDate.toDateString() === today.toDateString();
      } catch {
        return false;
      }
    });
    
    // Get supervisor name from first record
    const supervisorName = supervisorRecords[0]?.supervisorName || supervisorAccount;
    
    return {
      name: supervisorName,
      account: supervisorAccount,
      totalRecords: supervisorRecords.length,
      totalRevenue: supervisorRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0),
      todayRecords: todayRecords.length,
      todayRevenue: todayRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0),
      cashCount: supervisorRecords.filter(r => r.paymentMethod === 'Cash' && r.amountPaid > 0).length,
      mpesaCount: supervisorRecords.filter(r => r.paymentMethod === 'Mpesa' && r.amountPaid > 0).length
    };
  }).sort((a, b) => b.todayRevenue - a.todayRevenue);

  // Calculate comprehensive analytics
  const calculateAnalytics = () => {
    const totalRevenue = filteredRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0);
    const totalRecords = filteredRecords.length;
    const uniqueSupervisors = [...new Set(filteredRecords.map(r => r.supervisorAccount))].length;
    const averageTransaction = totalRecords > 0 ? totalRevenue / totalRecords : 0;
    
    // Payment method breakdown - only count completed transactions (amountPaid > 0)
    const cashRecords = filteredRecords.filter(r => r.paymentMethod === 'Cash' && r.amountPaid > 0);
    const mpesaRecords = filteredRecords.filter(r => r.paymentMethod === 'Mpesa' && r.amountPaid > 0);
    const cashRevenue = cashRecords.reduce((sum, r) => sum + r.amountPaid, 0);
    const mpesaRevenue = mpesaRecords.reduce((sum, r) => sum + r.amountPaid, 0);
    
    // Service type breakdown
    const serviceStats = new Map();
    filteredRecords.forEach(record => {
      const service = record.services || 'Unknown';
      if (!serviceStats.has(service)) {
        serviceStats.set(service, { count: 0, revenue: 0 });
      }
      serviceStats.get(service).count++;
      serviceStats.get(service).revenue += record.amountPaid;
    });
    
    // Hourly revenue breakdown
    const hourlyRevenue = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      revenue: 0,
      count: 0
    }));
    
    filteredRecords.forEach(record => {
      try {
        const time = record.time || '00:00:00';
        const hour = parseInt(time.split(':')[0]);
        if (hour >= 0 && hour < 24) {
          hourlyRevenue[hour].revenue += record.amountPaid;
          hourlyRevenue[hour].count++;
        }
      } catch (e) {
        // Skip invalid time formats
      }
    });
    
    return {
      totalRevenue,
      totalRecords,
      uniqueSupervisors,
      averageTransaction,
      cashCount: cashRecords.length,
      cashRevenue,
      mpesaCount: mpesaRecords.length,
      mpesaRevenue,
      serviceStats: Array.from(serviceStats.entries()).map(([service, data]) => ({
        service,
        count: data.count,
        revenue: data.revenue
      })).sort((a, b) => b.revenue - a.revenue),
      hourlyRevenue: hourlyRevenue.filter(h => h.revenue > 0 || h.count > 0)
    };
  };

  const analytics = calculateAnalytics();

  const exportToExcel = () => {
    const exportData = filteredRecords.map(record => ({
      'Registration': record.registrationNumber,
      'Car Model': record.carModel,
      'Services': record.services,
      'Amount Paid': record.amountPaid,
      'Payment Method': record.paymentMethod,
      'M-Pesa Code': record.mpesaCode || '',
      'Supervisor Account': record.supervisorAccount,
      'Supervisor Name': record.supervisorName,
      'Date': record.date,
      'Time': record.time,
      'Status': record.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Supervisor Activities');
    XLSX.writeFile(wb, `supervisor-activities-${dateFilter}.xlsx`);
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Supervisor Collection Report</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">
            Track payment collections, performance metrics, and statistics for all supervisor accounts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <Button onClick={loadRecords} variant="outline" className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto" disabled={loading}>
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </Button>
          <Button onClick={exportToExcel} className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto">
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export to Excel</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Supervisor Collection Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Collections</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
              KSh {analytics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All supervisor collections
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Active Supervisors</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
              {analytics.uniqueSupervisors}
            </div>
            <p className="text-xs text-muted-foreground">
              Collecting payments
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Cash Collections</CardTitle>
            <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
              KSh {analytics.cashRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.cashCount} cash transactions
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">M-Pesa Collections</CardTitle>
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
              KSh {analytics.mpesaRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.mpesaCount} M-Pesa transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Collection Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <PieChart className="h-4 w-4 sm:h-5 sm:w-5" />
              Collection Method Distribution
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              How supervisors are collecting payments (Cash vs M-Pesa)
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-blue-50 rounded-lg gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="font-semibold text-blue-800 text-sm">Cash Collections</p>
                    <p className="text-xs text-blue-600">{analytics.cashCount} transactions</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-blue-800 text-base sm:text-lg">
                    KSh {analytics.cashRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600">
                    {analytics.totalRevenue > 0 ? ((analytics.cashRevenue / analytics.totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-green-50 rounded-lg gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-600 rounded-full flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="font-semibold text-green-800 text-sm">M-Pesa Collections</p>
                    <p className="text-xs text-green-600">{analytics.mpesaCount} transactions</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-green-800 text-base sm:text-lg">
                    KSh {analytics.mpesaRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs sm:text-sm text-green-600">
                    {analytics.totalRevenue > 0 ? ((analytics.mpesaRevenue / analytics.totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
              Supervisor Collection Rankings
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Top performing supervisors by collection amount
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supervisorStats.slice(0, 5).map((supervisor, index) => (
                <div key={supervisor.account} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="max-w-xs">
                      <p className="font-medium text-sm truncate">{supervisor.name}</p>
                      <p className="text-xs text-muted-foreground">{supervisor.totalRecords} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      KSh {supervisor.totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {supervisor.cashCount}C + {supervisor.mpesaCount}M
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supervisor Collection Performance */}
      <Card>
        <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Award className="h-4 w-4 sm:h-5 sm:w-5" />
            Supervisor Collection Performance
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Payment collection statistics and performance rankings for all supervisor accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {supervisorStats.map((supervisor, index) => {
              // Calculate actual cash and M-Pesa revenue from records
              const supervisorRecords = records.filter(r => r.supervisorAccount === supervisor.account);
              const cashRevenue = supervisorRecords
                .filter(r => r.paymentMethod === 'Cash' && r.amountPaid > 0)
                .reduce((sum, r) => sum + r.amountPaid, 0);
              const mpesaRevenue = supervisorRecords
                .filter(r => r.paymentMethod === 'Mpesa' && r.amountPaid > 0)
                .reduce((sum, r) => sum + r.amountPaid, 0);
              
              return (
                <div key={supervisor.account} className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs sm:text-sm truncate">{supervisor.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {supervisor.account}
                        </p>
                      </div>
                    </div>
                    <Badge variant={index < 3 ? "default" : "secondary"} className="text-xs flex-shrink-0">
                      #{index + 1}
                    </Badge>
                  </div>
                  
                  {/* Collection Summary */}
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1 gap-1">
                        <span className="text-green-800 font-medium">Total Collections</span>
                        <span className="font-bold text-green-800 text-sm sm:text-lg">
                          KSh {supervisor.totalRevenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-green-600 gap-1">
                        <span>Today: KSh {supervisor.todayRevenue.toLocaleString()}</span>
                        <span>{supervisor.totalRecords} transactions</span>
                      </div>
                    </div>
                    
                    {/* Payment Method Breakdown */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-blue-50 rounded text-center">
                        <div className="text-blue-800 font-semibold text-xs sm:text-sm">
                          KSh {cashRevenue.toFixed(0)}
                        </div>
                        <div className="text-xs text-blue-600">
                          Cash ({supervisor.cashCount})
                        </div>
                      </div>
                      <div className="p-2 bg-green-50 rounded text-center">
                        <div className="text-green-800 font-semibold text-xs sm:text-sm">
                          KSh {mpesaRevenue.toFixed(0)}
                        </div>
                        <div className="text-xs text-green-600">
                          M-Pesa ({supervisor.mpesaCount})
                        </div>
                      </div>
                    </div>
                    
                    {/* Performance Indicators */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Today's Records: {supervisor.todayRecords}</span>
                      <span>Avg: KSh {supervisor.totalRecords > 0 ? (supervisor.totalRevenue / supervisor.totalRecords).toFixed(0) : 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Activity Records
          </CardTitle>
          <CardDescription>
            Detailed transaction records with advanced filtering and search capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by registration, model, or supervisor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select Supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Supervisors</SelectItem>
                {supervisorStats.map(supervisor => (
                  <SelectItem key={supervisor.account} value={supervisor.account}>
                    {supervisor.name} ({supervisor.account})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Mpesa">M-Pesa</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full md:w-48"
            />
          </div>

          {/* Results Summary */}
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">
                  Showing {filteredRecords.length} of {records.length} records
                </span>
                {supervisorFilter !== 'All' && (
                  <Badge variant="outline">
                    Supervisor: {supervisorStats.find(s => s.account === supervisorFilter)?.name || supervisorFilter}
                  </Badge>
                )}
                {paymentFilter !== 'All' && (
                  <Badge variant="outline">
                    Payment: {paymentFilter}
                  </Badge>
                )}
                {dateFilter && (
                  <Badge variant="outline">
                    Date: {new Date(dateFilter).toLocaleDateString()}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Revenue: <span className="font-semibold text-green-600">
                  KSh {filteredRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Records Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registration</TableHead>
                    <TableHead>Car Model</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Supervisor Account</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        No records found for the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.registrationNumber}</TableCell>
                        <TableCell>{record.carModel}</TableCell>
                        <TableCell className="max-w-xs truncate">{record.services}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          KSh {record.amountPaid.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.paymentMethod === 'Cash' ? 'default' : 'secondary'}>
                            {record.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.supervisorName || record.supervisorAccount || 'Unknown'}
                        </TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.time}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
