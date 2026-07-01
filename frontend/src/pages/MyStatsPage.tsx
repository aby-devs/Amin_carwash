import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  DollarSign, 
  Search, 
  Filter, 
  Download,
  Calendar,
  User,
  CreditCard,
  Loader2,
  TrendingUp,
  Target
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

export function MyStatsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Check if user is supervisor
  if (user?.role !== 'supervisor') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
              <p className="text-muted-foreground">Only supervisors can view their daily stats.</p>
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
        
        // Filter records for current supervisor by supervisor account
        const myRecords = response.data.filter(record => 
          record.supervisorAccount === user?.email || record.supervisorAccount === user?.name
        );
        setMyRecords(myRecords);
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
  }, [user]);

  // Filter my records
  const filteredRecords = myRecords.filter(record => {
    const matchesSearch = record.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.carModel?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    
    return matchesSearch && matchesPayment && matchesDate;
  });

  // Calculate stats
  const todayRecords = myRecords.filter(record => {
    try {
      const recordDate = new Date(record.date);
      const today = new Date(dateFilter);
      return recordDate.toDateString() === today.toDateString();
    } catch {
      return false;
    }
  });

  const stats = {
    totalRecords: myRecords.length,
    totalRevenue: myRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0),
    todayRecords: todayRecords.length,
    todayRevenue: todayRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0),
    cashCount: myRecords.filter(r => r.paymentMethod === 'Cash' && r.amountPaid > 0).length,
    mpesaCount: myRecords.filter(r => r.paymentMethod === 'Mpesa' && r.amountPaid > 0).length,
    averageTransaction: myRecords.length > 0 ? myRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0) / myRecords.filter(r => r.amountPaid > 0).length : 0
  };

  const exportToExcel = () => {
    const exportData = filteredRecords.map(record => ({
      'Registration': record.registrationNumber,
      'Car Model': record.carModel,
      'Services': record.services,
      'Amount Paid': record.amountPaid,
      'Payment Method': record.paymentMethod,
      'M-Pesa Code': record.mpesaCode || '',
      'Date': record.date,
      'Time': record.time,
      'Status': record.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'My Daily Stats');
    XLSX.writeFile(wb, `my-stats-${dateFilter}.xlsx`);
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">My Daily Stats</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">Track your daily performance and payment records</p>
        </div>
        <div className="flex-shrink-0">
          <Button onClick={exportToExcel} className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto">
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export to Excel</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Today's Records
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">{stats.todayRecords}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Records for {dateFilter ? new Date(dateFilter).toLocaleDateString() : 'today'}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              Today's Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">KSh {stats.todayRevenue.toLocaleString()}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Revenue for today</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">{stats.totalRecords}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">All time records</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              Avg Transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">KSh {stats.averageTransaction.toFixed(0)}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Average per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
              Payment Method Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-blue-50 rounded-lg gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0"></div>
                  <span className="font-medium text-sm">Cash Payments</span>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-bold text-base sm:text-lg">{stats.cashCount}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">transactions</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-green-50 rounded-lg gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full flex-shrink-0"></div>
                  <span className="font-medium text-sm">M-Pesa Payments</span>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-bold text-base sm:text-lg">{stats.mpesaCount}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">transactions</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs sm:text-sm">Total Revenue</span>
                <span className="font-semibold text-green-600 text-sm sm:text-base">KSh {stats.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs sm:text-sm">Total Records</span>
                <span className="font-semibold text-sm sm:text-base">{stats.totalRecords}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs sm:text-sm">Average Transaction</span>
                <span className="font-semibold text-sm sm:text-base">KSh {stats.averageTransaction.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs sm:text-sm">Cash vs M-Pesa</span>
                <span className="font-semibold text-sm sm:text-base">{stats.cashCount}:{stats.mpesaCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4">
          <CardTitle className="text-sm sm:text-base">My Payment Records</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Detailed view of your payment records for {dateFilter ? new Date(dateFilter).toLocaleDateString() : 'today'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3 sm:h-4 sm:w-4" />
              <Input
                placeholder="Search by registration or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-10 text-xs sm:text-sm"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-32 text-xs sm:text-sm">
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
                className="w-full sm:w-48 text-xs sm:text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mobile Card View */}
              <div className="block lg:hidden">
                <div className="space-y-3">
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No records found for the selected filters
                    </div>
                  ) : (
                    filteredRecords.map((record) => (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50/30 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{record.registrationNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">{record.carModel}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={record.paymentMethod === 'Cash' ? 'default' : 'secondary'} className="text-xs">
                              {record.paymentMethod}
                            </Badge>
                            <Badge variant={record.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {record.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Services</span>
                            <span className="text-xs text-gray-600 truncate max-w-48">{record.services}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Amount</span>
                            <span className="font-semibold text-green-600 text-sm">KSh {record.amountPaid.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Date & Time</span>
                            <span className="text-xs text-gray-600">{record.date} {record.time}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Registration</TableHead>
                      <TableHead className="text-xs">Car Model</TableHead>
                      <TableHead className="text-xs">Services</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Payment</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
                          No records found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium text-sm">{record.registrationNumber}</TableCell>
                          <TableCell className="text-sm">{record.carModel}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{record.services}</TableCell>
                          <TableCell className="font-semibold text-green-600 text-sm">
                            KSh {record.amountPaid.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.paymentMethod === 'Cash' ? 'default' : 'secondary'} className="text-xs">
                              {record.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{record.date}</TableCell>
                          <TableCell className="text-sm">{record.time}</TableCell>
                          <TableCell>
                            <Badge variant={record.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
