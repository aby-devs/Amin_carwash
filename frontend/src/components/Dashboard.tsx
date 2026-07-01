import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, DollarSign, Users, Calendar, TrendingUp, Clock, CreditCard } from "lucide-react";
import { CarWashRecord, DashboardStats } from "./CarWashRecord";
import heroImage from "@/assets/car-wash-hero.jpg";

interface DashboardProps {
  records: CarWashRecord[];
  dashboardStats?: DashboardStats | null;
  todayStats?: DashboardStats | null;
  weekStats?: DashboardStats | null;
  monthStats?: DashboardStats | null;
}

export function Dashboard({ records, dashboardStats, todayStats, weekStats, monthStats }: DashboardProps) {
  // Use backend stats if available, otherwise calculate locally
  const totalRevenue = dashboardStats?.totalRevenue ?? records.filter(r => r.status === 'completed').reduce((sum, record) => sum + record.amountPaid, 0);
  const totalServices = dashboardStats?.totalServices ?? records.filter(r => r.status === 'completed').length;
  const uniqueAttendants = dashboardStats?.uniqueAttendants ?? [...new Set(records.map(record => record.attendant))].length;
  const completedRecords = records.filter(r => r.status === 'completed');
  const pendingRecords = records.filter(r => r.status === 'active' || !r.status);
  const averageService = dashboardStats?.averageService ?? (completedRecords.length > 0 ? totalRevenue / completedRecords.length : 0);
  
  // Calculate pending services count (services with status 'active' are pending, or no status means pending)
  const pendingServices = dashboardStats?.pendingServices ?? records.filter(r => r.status === 'active' || !r.status).length;
  
  // Calculate pending bills amount (sum of amountPaid for all pending services)
  const pendingBillsAmount = records.filter(r => r.status === 'active' || !r.status).reduce((sum, record) => sum + record.amountPaid, 0);
  
  // Use backend payment breakdown if available - only count completed payments (status: 'completed')
  const mpesaCount = dashboardStats?.paymentBreakdown?.mpesa?.count ?? records.filter(r => r.paymentMethod === 'Mpesa' && r.status === 'completed').length;
  const mpesaRevenue = dashboardStats?.paymentBreakdown?.mpesa?.revenue ?? records.filter(r => r.paymentMethod === 'Mpesa' && r.status === 'completed').reduce((sum, record) => sum + record.amountPaid, 0);
  const cashCount = dashboardStats?.paymentBreakdown?.cash?.count ?? records.filter(r => r.paymentMethod === 'Cash' && r.status === 'completed').length;
  const cashRevenue = dashboardStats?.paymentBreakdown?.cash?.revenue ?? records.filter(r => r.paymentMethod === 'Cash' && r.status === 'completed').reduce((sum, record) => sum + record.amountPaid, 0);
  
  // For today's records, we still need to calculate locally since backend doesn't provide this breakdown
  const today = new Date();
  const todayString = today.toLocaleDateString();
  
  const todayRecords = records.filter(record => {
    // Only include completed records
    if (record.status !== 'completed') return false;
    
    // Handle both string dates and timestamp dates
    if (record.createdAt && record.createdAt.toDate) {
      // Firestore timestamp
      const recordDate = record.createdAt.toDate();
      return recordDate.toDateString() === today.toDateString();
    } else if (record.date) {
      // For sample data, use a more flexible comparison
      const recordDateStr = record.date;
      
      // Try to parse the record date and compare with today
      try {
        const recordDate = new Date(recordDateStr);
        const todayDate = new Date();
        
        // Compare year, month, and day
        return recordDate.getFullYear() === todayDate.getFullYear() &&
               recordDate.getMonth() === todayDate.getMonth() &&
               recordDate.getDate() === todayDate.getDate();
      } catch (e) {
        // If parsing fails, try direct string comparison as fallback
        return recordDateStr === todayString;
      }
    }
    return false;
  });
  
  // Get current week records
  const currentWeek = new Date();
  const startOfWeek = new Date(currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()));
  const weekRecords = records.filter(record => {
    // Only include completed records
    if (record.status !== 'completed') return false;
    
    const recordDate = new Date(record.date);
    return recordDate >= startOfWeek;
  });
  
  // Get current month records
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthRecords = records.filter(record => {
    // Only include completed records
    if (record.status !== 'completed') return false;
    
    const recordDate = new Date(record.date);
    return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
  });

  const stats = [
    {
      title: "Pending Services",
      value: pendingServices.toString(),
      subtitle: "Awaiting completion",
      icon: Clock,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Pending Bills",
      value: `KSh ${pendingBillsAmount.toLocaleString()}`,
      subtitle: "Amount outstanding",
      icon: CreditCard,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Total Services",
      value: totalServices.toString(),
      subtitle: `This Month: ${monthStats?.totalServices ?? monthRecords.length}`,
      icon: Car,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Total Revenue",
      value: `KSh ${totalRevenue.toLocaleString()}`,
      subtitle: `This Month: KSh ${(monthStats?.totalRevenue ?? monthRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0)).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Today's Services",
      value: (todayStats?.totalServices ?? todayRecords.length).toString(),
      subtitle: `This Week: ${weekStats?.totalServices ?? weekRecords.length}`,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Active Staff",
      value: uniqueAttendants.toString(),
      subtitle: `Avg Service: KSh ${averageService.toFixed(0)}`,
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const recentRecords = records.filter(r => r.status === 'completed').slice(0, 3); // Get first 3 (newest) completed records

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-3 w-3 md:h-4 md:w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
              <div className="text-lg md:text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
                </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{record.registrationNumber}</p>
                      <p className="text-sm text-muted-foreground">{record.carModel} • {record.attendant}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">KSh {record.amountPaid.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{record.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-semibold text-green-800">M-Pesa Payments</p>
                  <p className="text-sm text-green-600">{mpesaCount} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-800">KSh {mpesaRevenue.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-semibold text-blue-800">Cash Payments</p>
                  <p className="text-sm text-blue-600">{cashCount} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-800">KSh {cashRevenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 3 Staff Performance (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardStats?.staffPerformance && dashboardStats.staffPerformance.length > 0 ? (
                dashboardStats.staffPerformance.slice(0, 3).map((staff, index) => (
                  <div key={staff.attendant} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{staff.attendant}</p>
                        <p className="text-sm text-muted-foreground">{staff.services} services</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">KSh {staff.commission?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        Commission
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No staff data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Business Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center">
            <div className="p-3 md:p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-1 md:mb-2 text-blue-800 text-sm md:text-base">Today</h4>
              <div className="space-y-1 text-xs md:text-sm">
                <p className="font-bold text-blue-900">{todayStats?.totalServices ?? todayRecords.length} services</p>
                <p className="text-blue-600">KSh {(todayStats?.totalRevenue ?? todayRecords.reduce((sum, r) => sum + r.amountPaid, 0)).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-3 md:p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold mb-1 md:mb-2 text-purple-800 text-sm md:text-base">This Week</h4>
              <div className="space-y-1 text-xs md:text-sm">
                <p className="font-bold text-purple-900">{weekStats?.totalServices ?? weekRecords.length} services</p>
                <p className="text-purple-600">KSh {(weekStats?.totalRevenue ?? weekRecords.reduce((sum, r) => sum + r.amountPaid, 0)).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-3 md:p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold mb-1 md:mb-2 text-green-800 text-sm md:text-base">This Month</h4>
              <div className="space-y-1 text-xs md:text-sm">
                <p className="font-bold text-green-900">{monthStats?.totalServices ?? monthRecords.length} services</p>
                <p className="text-green-600">KSh {(monthStats?.totalRevenue ?? monthRecords.reduce((sum, r) => sum + r.amountPaid, 0)).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-3 md:p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold mb-1 md:mb-2 text-orange-800 text-sm md:text-base">Average</h4>
              <div className="space-y-1 text-xs md:text-sm">
                <p className="font-bold text-orange-900">KSh {averageService.toFixed(0)}</p>
                <p className="text-orange-600">per service</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}