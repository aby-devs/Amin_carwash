import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Calendar, User, Car, CreditCard, Clock, Filter } from "lucide-react";
import { CarWashRecord, DashboardStats } from "./CarWashRecord";
import { useAuth } from "@/contexts/AuthContext";

interface CarWashRecordsProps {
  records: CarWashRecord[];
  todayStats?: DashboardStats | null;
}

export function CarWashRecords({ records, todayStats }: CarWashRecordsProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState<"All" | "Cash" | "Mpesa">("All");
  const [filterStatus, setFilterStatus] = useState<"All" | "active" | "completed">("All");
  const [showMyRecordsOnly, setShowMyRecordsOnly] = useState(false);
  
  // Check if user can delete records (only managers)
  const canDelete = user?.role === 'manager';

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.carModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.attendant.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPayment = filterPayment === "All" || record.paymentMethod === filterPayment;
    const matchesStatus = filterStatus === "All" || record.status === filterStatus;
    
    // Filter for current supervisor's records only if enabled
    const matchesMyRecords = !showMyRecordsOnly || 
                           (user?.name && record.attendant.toLowerCase() === user.name.toLowerCase()) ||
                           (user?.email && record.attendant.toLowerCase() === user.email.toLowerCase());
    
    return matchesSearch && matchesPayment && matchesStatus && matchesMyRecords;
  });

  // Enhanced analytics
  const totalRevenue = records.filter(r => r.amountPaid > 0).reduce((sum, record) => sum + record.amountPaid, 0);
  
  // Fix today's records calculation - handle different date formats
  const today = new Date();
  const todayString = today.toLocaleDateString();
  
  const todayRecords = records.filter(record => {
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
  
  const weeklyRevenue = filteredRecords.filter(r => r.amountPaid > 0).reduce((sum, record) => sum + record.amountPaid, 0);
  const averageTransaction = filteredRecords.length > 0 ? weeklyRevenue / filteredRecords.length : 0;
  

  
  // Payment method breakdown - only count completed transactions (amountPaid > 0)
  const mpesaCount = filteredRecords.filter(r => r.paymentMethod === 'Mpesa' && r.amountPaid > 0).length;
  const cashCount = filteredRecords.filter(r => r.paymentMethod === 'Cash' && r.amountPaid > 0).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Business Reports & Analytics
            </CardTitle>
            <CardDescription>
              Comprehensive reporting and detailed analysis of car wash operations
            </CardDescription>
          </div>
          
          <div className="flex gap-3 text-center">
            <div className="bg-primary/10 rounded-lg p-3">
              <div className="text-xl font-bold text-primary">{filteredRecords.length}</div>
              <div className="text-xs text-muted-foreground">Filtered Records</div>
            </div>
            <div className="bg-success/10 rounded-lg p-3">
              <div className="text-xl font-bold text-success">KSh {weeklyRevenue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Filtered Revenue</div>
            </div>
            <div className="bg-accent/10 rounded-lg p-3">
              <div className="text-xl font-bold text-accent">KSh {averageTransaction.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">Avg Transaction</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by registration, model, or attendant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterPayment === "All" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPayment("All")}
            >
              <Filter className="h-4 w-4 mr-2" />
              All
            </Button>
            <Button
              variant={filterPayment === "Cash" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPayment("Cash")}
            >
              Cash
            </Button>
            <Button
              variant={filterPayment === "Mpesa" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPayment("Mpesa")}
            >
              M-Pesa
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterStatus === "All" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("All")}
            >
              All Status
            </Button>
            <Button
              variant={filterStatus === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("completed")}
            >
              Completed
            </Button>
            <Button
              variant={filterStatus === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("active")}
            >
              Pending
            </Button>
          </div>
          
          {/* My Records Only Toggle - Only show for supervisors */}
          {user?.role === 'supervisor' && (
            <div className="flex gap-2">
              <Button
                variant={showMyRecordsOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMyRecordsOnly(!showMyRecordsOnly)}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                {showMyRecordsOnly ? "My Records" : "All Records"}
              </Button>
            </div>
          )}
        </div>

        {/* My Records Payment Summary - Only show when "My Records" is enabled */}
        {showMyRecordsOnly && user?.role === 'supervisor' && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                My Payment Summary
              </CardTitle>
              <CardDescription>
                Payments recorded by {user.name || user.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-primary">
                    {filteredRecords.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Records</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">
                    KSh {filteredRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredRecords.filter(r => r.paymentMethod === 'Cash' && r.amountPaid > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Cash Payments</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredRecords.filter(r => r.paymentMethod === 'Mpesa' && r.amountPaid > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">M-Pesa Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="font-medium text-green-800">M-Pesa</span>
                  <div className="text-right">
                    <span className="font-bold text-green-900">{mpesaCount} transactions</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span className="font-medium text-blue-800">Cash</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-900">{cashCount} transactions</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Revenue Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total All Time:</span>
                  <span className="font-bold">KSh {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filtered View:</span>
                  <span className="font-bold">KSh {weeklyRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average per Service:</span>
                  <span className="font-bold">KSh {averageTransaction.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Today's Revenue:</span>
                  <span className="font-bold">
                    KSh {(todayStats?.totalRevenue ?? todayRecords.filter(r => r.amountPaid > 0).reduce((sum, r) => sum + r.amountPaid, 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Records */}
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No records found</h3>
              <p>No car wash records match your search criteria.</p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <Card key={record.id} className="border-l-4 border-l-primary hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-lg">{record.registrationNumber}</span>
                        <Badge variant="secondary">{record.carModel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{record.services}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>Attendant: {record.attendant}</span>
                      </div>
                    </div>
                    
                    <div className="text-center md:text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-success" />
                        <span className="font-bold text-success">KSh {record.amountPaid.toLocaleString()}</span>
                      </div>
                      <Badge 
                        variant={record.paymentMethod === 'Mpesa' ? 'default' : 'secondary'}
                        className={record.paymentMethod === 'Mpesa' ? 'bg-green-600' : ''}
                      >
                        {record.paymentMethod}
                      </Badge>
                    </div>
                    
                    <div className="text-center md:text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>{record.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{record.time}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}