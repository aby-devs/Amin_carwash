import { useState, useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";
import { CarWashRecord, DashboardStats } from "@/components/CarWashRecord";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeRecords } from "@/hooks/useRealtimeRecords";
import { addRecordSafely, updateRecordSafely } from "@/utils/recordUtils";

export function DashboardPage() {
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [todayStats, setTodayStats] = useState<DashboardStats | null>(null);
  const [weekStats, setWeekStats] = useState<DashboardStats | null>(null);
  const [monthStats, setMonthStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real-time record handlers
  const handleRealtimeRecordAdded = (record: CarWashRecord) => {
    setRecords(prev => addRecordSafely(prev, record));
  };

  const handleRealtimeRecordUpdated = (record: CarWashRecord) => {
    setRecords(prev => updateRecordSafely(prev, record));
  };

  // Set up real-time updates
  useRealtimeRecords({
    onRecordAdded: handleRealtimeRecordAdded,
    onRecordUpdated: handleRealtimeRecordUpdated,
  });

  // Load records and dashboard stats from API on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load records and all dashboard stats in parallel
      const [recordsResponse, allStatsResponse, todayStatsResponse, weekStatsResponse, monthStatsResponse] = await Promise.all([
        apiService.getRecords({ limit: 100 }),
        apiService.getDashboardStats('all'),
        apiService.getDashboardStats('today'),
        apiService.getDashboardStats('week'),
        apiService.getDashboardStats('month')
      ]);
      
      if (recordsResponse.success && recordsResponse.data) {
        setRecords(recordsResponse.data);
      } else {
        throw new Error(recordsResponse.message || 'Failed to load records');
      }
      
      if (allStatsResponse.success && allStatsResponse.data) {
        setDashboardStats(allStatsResponse.data);
      }
      
      if (todayStatsResponse.success && todayStatsResponse.data) {
        setTodayStats(todayStatsResponse.data);
      }
      
      if (weekStatsResponse.success && weekStatsResponse.data) {
        setWeekStats(weekStatsResponse.data);
      }
      
      if (monthStatsResponse.success && monthStatsResponse.data) {
        setMonthStats(monthStatsResponse.data);
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast({
        title: "Error Loading Data",
        description: "Could not connect to the server. Using offline mode.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Dashboard 
        records={records} 
        dashboardStats={dashboardStats}
        todayStats={todayStats}
        weekStats={weekStats}
        monthStats={monthStats}
      />
    </div>
  );
}
