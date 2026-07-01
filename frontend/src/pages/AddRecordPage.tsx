import { useState, useEffect } from "react";
import { ServiceManagement } from "@/components/CarWashRecord";
import { CarWashRecord } from "@/components/CarWashRecord";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeRecords } from "@/hooks/useRealtimeRecords";
import { addRecordSafely, updateRecordSafely } from "@/utils/recordUtils";

export function AddRecordPage() {
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real-time record handlers
  const handleRealtimeRecordAdded = (record: CarWashRecord) => {
    setRecords(prev => addRecordSafely(prev, record));
    toast({
      title: "New Service Added",
      description: `Service for ${record.registrationNumber} has been added.`,
    });
  };

  const handleRealtimeRecordUpdated = (record: CarWashRecord) => {
    setRecords(prev => updateRecordSafely(prev, record));
    toast({
      title: "Service Updated",
      description: `Service for ${record.registrationNumber} has been updated.`,
    });
  };

  // Set up real-time updates
  useRealtimeRecords({
    onRecordAdded: handleRealtimeRecordAdded,
    onRecordUpdated: handleRealtimeRecordUpdated,
  });

  // Load records from API on component mount
  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getRecords({ limit: 100 });
      if (response.success && response.data) {
        setRecords(response.data);
      } else {
        throw new Error(response.message || 'Failed to load records');
      }
    } catch (err) {
      console.error('Error loading records:', err);
      setError(err instanceof Error ? err.message : 'Failed to load records');
      toast({
        title: "Error Loading Records",
        description: "Could not connect to the server. Using offline mode.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (newRecord: Omit<CarWashRecord, 'id' | 'date' | 'time' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await apiService.addRecord(newRecord);
      if (response.success && response.data) {
        setRecords(prev => addRecordSafely(prev, response.data!));
        
        toast({
          title: "Record Added",
          description: "Car wash record has been successfully saved.",
        });
      } else {
        throw new Error(response.message || 'Failed to add record');
      }
    } catch (err) {
      console.error('Error adding record:', err);
      toast({
        title: "Error Adding Record",
        description: err instanceof Error ? err.message : 'Failed to add record',
        variant: "destructive"
      });
    }
  };

  const handleUpdateRecord = async (recordId: string, updatedRecord: Partial<CarWashRecord>) => {
    try {
      const response = await apiService.updateRecord(recordId, updatedRecord);
      if (response.success && response.data) {
        setRecords(prev => prev.map(record => 
          record.id === recordId ? response.data! : record
        ));
        
        toast({
          title: "Record Updated",
          description: "Service record has been updated successfully.",
        });
      } else {
        throw new Error(response.message || 'Failed to update record');
      }
    } catch (err) {
      console.error('Error updating record:', err);
      toast({
        title: "Error Updating Record",
        description: err instanceof Error ? err.message : 'Failed to update record',
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const response = await apiService.deleteRecord(recordId);
      if (response.success) {
        setRecords(prev => prev.filter(record => record.id !== recordId));
        
        toast({
          title: "Record Deleted",
          description: "Service record has been deleted successfully.",
        });
      } else {
        throw new Error(response.message || 'Failed to delete record');
      }
    } catch (err) {
      console.error('Error deleting record:', err);
      toast({
        title: "Error Deleting Record",
        description: err instanceof Error ? err.message : 'Failed to delete record',
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 md:p-8 lg:p-10">
      <ServiceManagement 
        records={records} 
        onAddRecord={handleAddRecord} 
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
      />
    </div>
  );
}
