import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CarWashRecordForm, CarWashRecord, ServiceManagement } from "./CarWashRecord";
import { CarWashRecords } from "./CarWashRecords";
import { Dashboard } from "./Dashboard";
// import { AppSidebar } from "./AppSidebar"; // No longer needed with page-based routing
import { Car, Database, Menu, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api";



export function CarWashApp() {
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Get the active tab from localStorage, default to "dashboard"
    return localStorage.getItem('carWashActiveTab') || "dashboard";
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load records from API on component mount
  useEffect(() => {
    loadRecords();
  }, []);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('carWashActiveTab', activeTab);
  }, [activeTab]);

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
        setRecords(prev => [response.data!, ...prev]);
        
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



  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard records={records} />;
      case "add-record":
        return <ServiceManagement records={records} onAddRecord={handleAddRecord} onUpdateRecord={handleUpdateRecord} onDeleteRecord={handleDeleteRecord} />;
      case "records":
        return <CarWashRecords records={records} />;
      default:
        return <Dashboard records={records} />;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Legacy component - now just renders content without sidebar */}
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          <strong>Note:</strong> This is the legacy component-based view. 
          The new page-based navigation is now active. Use the sidebar to navigate between pages.
        </p>
      </div>
      {renderContent()}
    </div>
  );
}