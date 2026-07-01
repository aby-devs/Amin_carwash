import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, CreditCard, User, Search, Filter, Edit, Trash2, X, DollarSign, Download, Loader2, Calendar, ArrowUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from 'xlsx';

export interface CarWashRecord {
  id: string;
  registrationNumber: string;
  carModel: string;
  services: string;
  vehicleType?: string;
  serviceOffered?: string;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Mpesa';
  attendant: string;
  supervisorAccount?: string; // User account that created this record
  supervisorName?: string; // Name of the supervisor account
  date: string;
  time: string;
  mpesaCode?: string;
  createdAt?: any;
  updatedAt?: any;
  status: 'pending' | 'active' | 'Pending' | 'In Progress' | 'completed' | 'Completed';
}

export interface ActiveService {
  id: string;
  registrationNumber: string;
  carModel: string;
  vehicleType: string;
  serviceOffered: string[];
  attendant: string;
  date: string;
  time: string;
  createdAt: any;
  status: 'active';
  amountPaid: number;
  supervisorAccount?: string;
  supervisorName?: string;
}

export interface PaymentFormData {
  amountPaid: string;
  paymentMethod: 'Cash' | 'Mpesa' | '';
  mpesaCode: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalServices: number;
  pendingServices?: number;
  uniqueAttendants: number;
  averageService: number;
  paymentBreakdown: {
    mpesa: {
      count: number;
      revenue: number;
    };
    cash: {
      count: number;
      revenue: number;
    };
  };
  staffPerformance: Array<{
    attendant: string;
    services: number;
    revenue: number;
    commission: number;
    averageService: number;
  }>;
  recentRecords: CarWashRecord[];
}

interface CarWashRecordFormProps {
  onAddRecord: (record: Partial<CarWashRecord>) => void;
}

interface ServiceManagementProps {
  records: CarWashRecord[];
  onAddRecord: (record: Partial<CarWashRecord>) => void;
  onUpdateRecord?: (recordId: string, updatedRecord: Partial<CarWashRecord>) => void;
  onDeleteRecord?: (recordId: string) => void;
}

export function ServiceManagement({ records, onAddRecord, onUpdateRecord, onDeleteRecord }: ServiceManagementProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if user can delete records (only managers)
  const canDelete = user?.role === 'manager';
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [paymentFilter, setPaymentFilter] = useState('All Payment');
  const [editingRecord, setEditingRecord] = useState<CarWashRecord | null>(null);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  
  // State for available services
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  
  // New state for active services and payment form
  const [activeServices, setActiveServices] = useState<ActiveService[]>([]);
  const [completedServices, setCompletedServices] = useState<CarWashRecord[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedActiveService, setSelectedActiveService] = useState<ActiveService | null>(null);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  // Load available services from settings
  useEffect(() => {
    const loadAvailableServices = async () => {
      try {
        setLoadingServices(true);
        const response = await apiService.getSettings();
        if (response.success && response.data?.availableServices) {
          setAvailableServices(response.data.availableServices);
        } else {
          // Fallback to default services if settings don't exist
          setAvailableServices([
            'Engine Steam Wash',
            'Under Wash',
            'Executive Wash',
            'Vacuum',
            'Vacuum and shampoo',
            'Leather Care Cleaner',
            'Dashboard Shine',
            'Executive Machine Polish',
            'Executive Buffing',
            'Air-con Refill',
            'Water Marks',
            'Rim Restoration',
            'Engine Wash'
          ]);
        }
      } catch (error) {
        console.error('Failed to load available services:', error);
        // Fallback to default services
        setAvailableServices([
          'Engine Steam Wash',
          'Under Wash',
          'Executive Wash',
          'Vacuum',
          'Vacuum and shampoo',
          'Leather Care Cleaner',
          'Dashboard Shine',
          'Executive Machine Polish',
          'Executive Buffing',
          'Air-con Refill',
          'Water Marks',
          'Rim Restoration',
          'Engine Wash'
        ]);
      } finally {
        setLoadingServices(false);
      }
    };

    loadAvailableServices();
  }, []);
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    amountPaid: '',
    paymentMethod: '',
    mpesaCode: ''
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServiceDropdownOpen(false);
      }
    };

    if (isServiceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isServiceDropdownOpen]);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    carModel: '',
    vehicleType: '' as 'Saloon' | '4*4/SUV' | '',
    serviceOffered: [] as string[],
    attendant: '',
    amountPaid: '',
    date: (() => {
      // Use East Africa Time (EAT, UTC+3)
      const today = new Date();
      const eatOffset = 3 * 60; // 3 hours in minutes
      const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
      const eatTime = new Date(utc + (eatOffset * 60000));
      
      const year = eatTime.getFullYear();
      const month = String(eatTime.getMonth() + 1).padStart(2, '0');
      const day = String(eatTime.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })() // Will be updated when dateFilter changes
  });


  // Update form date when dateFilter changes
  useEffect(() => {
    if (dateFilter) {
      setFormData(prev => ({
        ...prev,
        date: dateFilter
      }));
    }
  }, [dateFilter]);

  // Auto-populate attendant field with current user's name
  useEffect(() => {
    if (user?.name && !formData.attendant) {
      setFormData(prev => ({
        ...prev,
        attendant: user.name
      }));
    }
  }, [user?.name, formData.attendant]);

  // Separate active and completed services from database records
  useEffect(() => {
    const active: ActiveService[] = [];
    const completed: CarWashRecord[] = [];
    
    records.forEach(record => {
      if (record.status === 'active' || (!record.status && record.amountPaid === 0)) {
        // Convert to active service format
        const activeService: ActiveService = {
          id: record.id,
          registrationNumber: record.registrationNumber,
          carModel: record.carModel,
          vehicleType: record.vehicleType || '',
          serviceOffered: record.serviceOffered ? record.serviceOffered.split(', ') : [],
          attendant: record.attendant,
          date: record.date,
          time: record.time,
          createdAt: record.createdAt,
          status: 'active',
          amountPaid: record.amountPaid,
          supervisorAccount: record.supervisorAccount,
          supervisorName: record.supervisorName
        };
        active.push(activeService);
      } else {
        // Add to completed services
        completed.push(record);
      }
    });
    
    setActiveServices(active);
    setCompletedServices(completed);
  }, [records]);

  // Apply filters to active and completed services
  const filteredActiveServices = activeServices.filter(service => {
    const matchesSearch = service.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.carModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.attendant.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filtering
    let matchesDate = true;
    if (dateFilter) {
      try {
        const recordDate = new Date(service.date);
        const filterDate = new Date(dateFilter);
        
        if (!isNaN(recordDate.getTime()) && !isNaN(filterDate.getTime())) {
          matchesDate = recordDate.toDateString() === filterDate.toDateString();
        }
      } catch (error) {
        matchesDate = true;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  const filteredCompletedServices = completedServices.filter(record => {
    const matchesSearch = record.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.carModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.attendant.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filtering
    let matchesDate = true;
    if (dateFilter) {
      try {
        const recordDate = new Date(record.date);
        const filterDate = new Date(dateFilter);
        
        if (!isNaN(recordDate.getTime()) && !isNaN(filterDate.getTime())) {
          matchesDate = recordDate.toDateString() === filterDate.toDateString();
        }
      } catch (error) {
        matchesDate = true;
      }
    }
    
    const matchesPayment = paymentFilter === 'All Payment' || record.paymentMethod === paymentFilter;
    return matchesSearch && matchesDate && matchesPayment;
  });


  // Generate unique ID for services
  const generateServiceId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `SO-${year}${month}${day}-${randomNum}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      if (!formData.registrationNumber || !formData.carModel || !formData.vehicleType || 
          !formData.serviceOffered || formData.serviceOffered.length === 0 || !formData.attendant || 
          !formData.amountPaid || !formData.date) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      // Create active service record with agreed amount (pending payment)
      console.log('Creating record with date:', formData.date);
      console.log('Current system date:', new Date().toISOString().split('T')[0]);
      
      const activeServiceRecord: Omit<CarWashRecord, 'id' | 'time' | 'createdAt' | 'updatedAt'> = {
        registrationNumber: formData.registrationNumber,
        carModel: formData.carModel,
        services: `${formData.vehicleType} - ${formData.serviceOffered.join(', ')}`,
        vehicleType: formData.vehicleType,
        serviceOffered: formData.serviceOffered.join(', '),
        amountPaid: parseFloat(formData.amountPaid) || 0, // Record the agreed amount
        paymentMethod: 'Cash' as 'Cash' | 'Mpesa', // Default, will be updated during payment
        attendant: formData.attendant,
        supervisorAccount: user?.email || user?.name || 'unknown',
        supervisorName: user?.name || user?.email || 'unknown',
        date: formData.date,
        status: 'active' as 'active' | 'completed'
      };

      // Save to database via onAddRecord
      await onAddRecord(activeServiceRecord);
      
      toast({
        title: "Service Started",
        description: "Service has been recorded. Complete payment after service is done.",
      });
      
      resetForm();
      setShowForm(false);
      
      // Update the records state immediately without page refresh
      // The record will be added to the state by the parent component
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "Error Adding Service",
        description: "Failed to add service. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => {
      const currentServices = prev.serviceOffered;
      const newServices = currentServices.includes(service)
        ? currentServices.filter(s => s !== service)
        : [...currentServices, service];
      
      return {
        ...prev,
        serviceOffered: newServices
      };
    });
    
    // Keep dropdown open for multiple selections
    // setIsServiceDropdownOpen(false);
  };

  // Payment form handlers
  const handlePayClick = (service: ActiveService) => {
    setSelectedActiveService(service);
    setShowPaymentForm(true);
    setPaymentFormData({
      amountPaid: service.amountPaid?.toString() || '',
      paymentMethod: '',
      mpesaCode: ''
    });
  };

  // Handle edit active service
  const handleEditActiveService = (service: ActiveService) => {
    // Convert ActiveService to CarWashRecord format for editing
    const recordToEdit: CarWashRecord = {
      id: service.id,
      registrationNumber: service.registrationNumber,
      carModel: service.carModel,
      services: `${service.vehicleType} - ${service.serviceOffered.join(', ')}`,
      vehicleType: service.vehicleType,
      serviceOffered: service.serviceOffered.join(', '),
      amountPaid: 0,
      paymentMethod: 'Cash',
      attendant: service.attendant,
      date: service.date,
      time: service.time || '',
      status: 'active',
      createdAt: service.createdAt,
      updatedAt: service.createdAt
    };
    
    handleEditRecord(recordToEdit);
  };

  // Handle delete active service
  const handleDeleteActiveService = async (service: ActiveService) => {
    if (window.confirm(`Are you sure you want to delete the service for ${service.registrationNumber}?`)) {
      try {
        if (onDeleteRecord) {
          await onDeleteRecord(service.id);
        } else {
          // Fallback to direct API call if parent handler not provided
          const response = await apiService.deleteRecord(service.id);
          if (response.success) {
            toast({
              title: "Service Deleted",
              description: "The service has been deleted successfully.",
            });
          } else {
            throw new Error(response.message || 'Failed to delete service');
          }
        }
      } catch (error) {
        console.error('Error deleting service:', error);
        toast({
          title: "Error Deleting Service",
          description: `Failed to delete service: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPaymentSubmitting) return; // Prevent double submission
    
    if (!selectedActiveService || !paymentFormData.paymentMethod) {
      toast({
        title: "Missing Payment Information",
        description: "Please fill in all required payment fields.",
        variant: "destructive"
      });
      return;
    }

    if (paymentFormData.paymentMethod === 'Mpesa' && !paymentFormData.mpesaCode) {
      toast({
        title: "Missing M-Pesa Code",
        description: "Please enter the M-Pesa transaction code.",
        variant: "destructive"
      });
      return;
    }

    setIsPaymentSubmitting(true);
    try {
      // Create completed record
      const completedRecord: Partial<CarWashRecord> = {
        registrationNumber: selectedActiveService.registrationNumber,
        carModel: selectedActiveService.carModel,
        services: `${selectedActiveService.vehicleType} - ${selectedActiveService.serviceOffered.join(', ')}`,
        vehicleType: selectedActiveService.vehicleType,
        serviceOffered: selectedActiveService.serviceOffered.join(', '),
        amountPaid: selectedActiveService.amountPaid, // Use the agreed amount from the service
        paymentMethod: paymentFormData.paymentMethod as 'Cash' | 'Mpesa',
        attendant: selectedActiveService.attendant,
        supervisorAccount: user?.email || user?.name || 'unknown',
        supervisorName: user?.name || user?.email || 'unknown',
        date: selectedActiveService.date,
        status: 'completed',
        ...(paymentFormData.paymentMethod === 'Mpesa' && paymentFormData.mpesaCode && { mpesaCode: paymentFormData.mpesaCode })
      };

      // Update the record using parent handler if available
      if (onUpdateRecord) {
        await onUpdateRecord(selectedActiveService.id, completedRecord);
        setShowPaymentForm(false);
        setSelectedActiveService(null);
        setIsPaymentSubmitting(false);
        setPaymentFormData({
          amountPaid: '',
          paymentMethod: '',
          mpesaCode: ''
        });
      } else {
        // Fallback to direct API call if parent handler not provided
        const response = await apiService.updateRecord(selectedActiveService.id, completedRecord);
        if (response.success) {
          toast({
            title: "Payment Completed",
            description: "Service has been completed and payment recorded.",
          });
          setShowPaymentForm(false);
          setSelectedActiveService(null);
          setIsPaymentSubmitting(false);
          setPaymentFormData({
            amountPaid: '',
            paymentMethod: '',
            mpesaCode: ''
          });
        } else {
          throw new Error(response.message || 'Failed to update record');
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPaymentSubmitting(false);
    }
  };


  const handleEditRecord = (record: CarWashRecord) => {
    setEditingRecord(record);
    
    // Parse services - try both serviceOffered and services fields
    let servicesArray: string[] = [];
    if (record.serviceOffered) {
      servicesArray = record.serviceOffered.split(', ').map(s => s.trim());
    } else if (record.services) {
      // If serviceOffered is not available, try to parse from services field
      // Services field format: "VehicleType - Service1, Service2, Service3"
      const servicesPart = record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services;
      servicesArray = servicesPart.split(', ').map(s => s.trim());
    }
    
    // Parse vehicle type - try to extract from services field if vehicleType is missing
    let vehicleType = record.vehicleType || '';
    if (!vehicleType && record.services && record.services.includes(' - ')) {
      vehicleType = record.services.split(' - ')[0];
    }
    
    // Convert date to YYYY-MM-DD format for the date input
    let dateValue = record.date;
    try {
      if (record.date && !record.date.includes('-')) {
        // If date is in DD/MM/YYYY format, convert to YYYY-MM-DD
        const date = new Date(record.date);
        if (!isNaN(date.getTime())) {
          dateValue = date.toISOString().split('T')[0];
        }
      }
    } catch (error) {
      console.error('Date conversion error:', error);
    }
    
    setFormData({
      registrationNumber: record.registrationNumber,
      carModel: record.carModel,
      vehicleType: vehicleType as 'Saloon' | '4*4/SUV' | '',
      serviceOffered: servicesArray,
      attendant: record.attendant,
      amountPaid: record.amountPaid.toString(),
      date: dateValue || new Date().toISOString().split('T')[0]
    });
    setShowForm(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      setDeletingRecordId(recordId);
      try {
        if (onDeleteRecord) {
          await onDeleteRecord(recordId);
        } else {
          // Fallback to direct API call if parent handler not provided
          const response = await apiService.deleteRecord(recordId);
          if (response.success) {
            toast({
              title: "Record Deleted",
              description: "The service record has been deleted successfully.",
            });
          } else {
            console.error('Delete failed with response:', response);
            throw new Error(response.message || 'Failed to delete record');
          }
        }
      } catch (error) {
        console.error('Error deleting record:', error);
        console.error('Record ID that failed:', recordId);
        console.error('Full error object:', error);
        
        // Check if it's a network error
        if (error instanceof TypeError && error.message.includes('fetch')) {
          toast({
            title: "Network Error",
            description: "Unable to connect to the server. Please check your internet connection and try again.",
            variant: "destructive"
          });
        } else {
        toast({
          title: "Error Deleting Record",
          description: `Failed to delete record: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
        }
      } finally {
        setDeletingRecordId(null);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      registrationNumber: '',
      carModel: '',
      vehicleType: '' as 'Saloon' | '4*4/SUV' | '',
      serviceOffered: [],
      attendant: '',
      amountPaid: '',
      date: dateFilter || new Date().toISOString().split('T')[0] // Use selected date filter or today
    });
    setEditingRecord(null);
  };

  const formatDate = (dateString: string) => {
    try {
      // Handle different date formats
      let date;
      if (dateString.includes('/')) {
        // Handle DD/MM/YYYY or MM/DD/YYYY format
        const parts = dateString.split('/');
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        // Handle YYYY-MM-DD format (from date input)
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString; // Return original string if error
    }
  };

  // Sort records with latest added at the top
  const sortedRecords = [...records].sort((a, b) => {
    // First try to sort by createdAt if available
    if (a.createdAt && b.createdAt) {
      if (a.createdAt.toDate && b.createdAt.toDate) {
        return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
      }
      return b.createdAt - a.createdAt;
    }
    // Fallback to date field - handle different date formats
    try {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // Check if dates are valid
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        // If dates are invalid, sort by string comparison
        return b.date.localeCompare(a.date);
      }
      
      return dateB.getTime() - dateA.getTime();
    } catch (error) {
      console.error('Date sorting error:', error);
      return 0; // Keep original order if sorting fails
    }
  });

  const filteredRecords = sortedRecords.filter(record => {
    const matchesSearch = record.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.attendant.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filtering - convert record date to YYYY-MM-DD format for comparison
    let matchesDate = true;
    if (dateFilter) {
      try {
        const recordDate = new Date(record.date);
        const filterDate = new Date(dateFilter);
        
        // Check if dates are valid
        if (!isNaN(recordDate.getTime()) && !isNaN(filterDate.getTime())) {
          matchesDate = recordDate.toDateString() === filterDate.toDateString();
        } else {
          // If date parsing fails, don't filter by date
          matchesDate = true;
        }
      } catch (error) {
        // If date parsing fails, don't filter by date
        matchesDate = true;
      }
    }
    
    const matchesPayment = paymentFilter === 'All Payment' || record.paymentMethod === paymentFilter;
    return matchesSearch && matchesDate && matchesPayment;
  });

  // Use the filtered records directly (already includes date filtering)
  const todayRecords = filteredRecords;

  // Calculate summary statistics for filtered data
  const totalRevenue = filteredCompletedServices.reduce((sum, record) => sum + record.amountPaid, 0);
  const totalServices = filteredCompletedServices.length;
  const mpesaCount = filteredCompletedServices.filter(r => r.paymentMethod === 'Mpesa' && r.amountPaid > 0).length;
  const cashCount = filteredCompletedServices.filter(r => r.paymentMethod === 'Cash' && r.amountPaid > 0).length;
  const mpesaRevenue = filteredCompletedServices.filter(r => r.paymentMethod === 'Mpesa' && r.amountPaid > 0).reduce((sum, record) => sum + record.amountPaid, 0);
  const cashRevenue = filteredCompletedServices.filter(r => r.paymentMethod === 'Cash' && r.amountPaid > 0).reduce((sum, record) => sum + record.amountPaid, 0);


  const exportServicesToExcel = async () => {
    try {
      // Get all services for the current month
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Get start and end dates for current month
      const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`;

      // Fetch all records for the month
      const response = await apiService.getRecords({
        startDate: startOfMonth,
        endDate: endOfMonth,
        limit: 1000
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch service data');
      }

      const monthlyRecords = response.data;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Prepare service data
      const serviceData = monthlyRecords.map((record: any, index: number) => ({
        'No.': index + 1,
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

      // Create service worksheet
      const serviceWorksheet = XLSX.utils.json_to_sheet(serviceData);
      
      // Set column widths
      serviceWorksheet['!cols'] = [
        { wch: 5 },  // No.
        { wch: 12 }, // Date
        { wch: 18 }, // Registration Number
        { wch: 20 }, // Car Model
        { wch: 15 }, // Vehicle Type
        { wch: 25 }, // Service Offered
        { wch: 15 }, // Amount Paid
        { wch: 15 }, // Payment Method
        { wch: 18 }, // Attendant
        { wch: 15 }, // M-Pesa Code
        { wch: 10 }  // Time
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, serviceWorksheet, 'Service Records');

      // Create summary data
      const summaryData = [];
      
      // Header
      summaryData.push(['SERVICE RECORDS SUMMARY']);
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
      const totalRevenue = monthlyRecords.reduce((sum: number, r: any) => sum + r.amountPaid, 0);
      const uniqueVehicles = [...new Set(monthlyRecords.map((r: any) => r.registrationNumber))].length;
      const uniqueStaff = [...new Set(monthlyRecords.map((r: any) => r.attendant))].length;
      const averageOrderValue = monthlyRecords.length > 0 ? totalRevenue / monthlyRecords.length : 0;

      summaryData.push(['MONTHLY SUMMARY']);
      summaryData.push(['Metric', 'Value']);
      summaryData.push(['Total Service Records', monthlyRecords.length]);
      summaryData.push(['Total Revenue (KSh)', totalRevenue.toLocaleString()]);
      summaryData.push(['Unique Vehicles Served', uniqueVehicles]);
      summaryData.push(['Active Staff Members', uniqueStaff]);
      summaryData.push(['Average Order Value (KSh)', averageOrderValue.toLocaleString()]);
      summaryData.push([]); // Empty row

      // Service type breakdown
      const serviceMap = new Map();
      monthlyRecords.forEach((record: any) => {
        const service = record.serviceOffered || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[1] : record.services);
        const vehicleType = record.vehicleType || (record.services && record.services.includes(' - ') ? record.services.split(' - ')[0] : 'Unknown');
        const key = `${service} - ${vehicleType}`;
        
        if (!serviceMap.has(key)) {
          serviceMap.set(key, {
            service,
            vehicleType,
            count: 0,
            revenue: 0
          });
        }
        const serviceData = serviceMap.get(key);
        serviceData.count += 1;
        serviceData.revenue += record.amountPaid;
      });

      const serviceStats = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);

      summaryData.push(['SERVICE TYPE BREAKDOWN']);
      summaryData.push(['Service', 'Vehicle Type', 'Count', 'Revenue (KSh)', 'Avg per Service (KSh)']);
      serviceStats.forEach(service => {
        const avgPerService = service.count > 0 ? service.revenue / service.count : 0;
        summaryData.push([
          service.service,
          service.vehicleType,
          service.count,
          service.revenue.toLocaleString(),
          avgPerService.toLocaleString()
        ]);
      });
      summaryData.push([]); // Empty row

      // Staff performance breakdown
      const staffMap = new Map();
      monthlyRecords.forEach((record: any) => {
        if (!staffMap.has(record.attendant)) {
          staffMap.set(record.attendant, {
            name: record.attendant,
            count: 0,
            revenue: 0
          });
        }
        const staff = staffMap.get(record.attendant);
        staff.count += 1;
        staff.revenue += record.amountPaid;
      });

      const staffStats = Array.from(staffMap.values()).sort((a, b) => b.revenue - a.revenue);

      summaryData.push(['STAFF PERFORMANCE BREAKDOWN']);
      summaryData.push(['Staff Member', 'Services', 'Revenue (KSh)', 'Avg per Service (KSh)']);
      staffStats.forEach(staff => {
        const avgPerService = staff.count > 0 ? staff.revenue / staff.count : 0;
        summaryData.push([
          staff.name,
          staff.count,
          staff.revenue.toLocaleString(),
          avgPerService.toLocaleString()
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
      const filename = `service-records-${monthName.toLowerCase()}-${currentYear}.xlsx`;

      // Write file
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Excel Export Successful",
        description: `Service data exported for ${monthName} ${currentYear}`,
      });

    } catch (error) {
      console.error('Error exporting services:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Service Management</h1>
          <p className="text-base text-gray-600">Manage car wash services, track revenue, and monitor transactions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={exportServicesToExcel} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Monthly Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Total Services
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-blue-50">
              <Car className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-blue-600">{totalServices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredRecords.length} filtered
            </p>
          </CardContent>
        </Card>

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
            <div className="text-lg md:text-2xl font-bold text-green-600">KSh {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalServices > 0 ? `Avg: KSh ${Math.round(totalRevenue / totalServices).toLocaleString()}` : 'No services'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              M-Pesa
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-purple-50">
              <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-purple-600">{mpesaCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              KSh {mpesaRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Cash
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-orange-50">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-orange-600">{cashCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              KSh {cashRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scroll to Top Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          size="sm"
          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Services Table */}
      <Card className="border-l-4 border-l-orange-500 bg-orange-50/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-orange-600 text-xl font-bold">
            <Car className="h-5 w-5" />
            Active Services (Pending Payment)
          </CardTitle>
          <CardDescription className="text-gray-600 text-sm mt-1">
            Services currently in progress or waiting for payment
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Search and Filter Controls */}
          <div className="p-6 border-b bg-orange-50/50">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by registration, model, or service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Service
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden">
            {filteredActiveServices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground p-4">
                <div className="text-6xl mb-4">🚗</div>
                <div className="text-lg font-semibold mb-2">No Active Services</div>
                <div className="text-sm mb-2">All services are completed</div>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {filteredActiveServices.map((service) => (
                  <div key={service.id} className="bg-white border border-orange-200 rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-orange-800">{service.registrationNumber}</div>
                      <span className="text-xs text-gray-500">{formatDate(service.date)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Supervisor:</span> {service.supervisorName || 'N/A'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="font-medium text-gray-600">Model:</span> {service.carModel}</div>
                      <div><span className="font-medium text-gray-600">Type:</span> {service.vehicleType}</div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-600">Services:</span> {service.serviceOffered.join(', ')}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">👤 {service.attendant}</span>
                        <span className="text-sm font-semibold text-green-600">KSh {service.amountPaid}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handlePayClick(service)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Pay
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <Button
                        onClick={() => handleEditActiveService(service)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      {canDelete && (
                        <Button
                          onClick={() => handleDeleteActiveService(service)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold py-4 px-4">Date</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Registration</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Vehicle Type</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Model</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Services</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Amount</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Attendant</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Supervisor</TableHead>
                  <TableHead className="font-semibold py-4 px-4 text-center">Payment</TableHead>
                  <TableHead className="font-semibold py-4 px-4 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActiveServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <div className="text-6xl mb-4">🚗</div>
                      <div className="text-lg font-semibold mb-2">No Active Services</div>
                      <div className="text-sm mb-2">All services are completed</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActiveServices.map((service) => (
                    <TableRow key={service.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium py-4 px-4">{formatDate(service.date)}</TableCell>
                      <TableCell className="font-medium py-4 px-4">{service.registrationNumber}</TableCell>
                      <TableCell className="py-4 px-4">{service.vehicleType}</TableCell>
                      <TableCell className="py-4 px-4">{service.carModel}</TableCell>
                      <TableCell className="py-4 px-4 max-w-xs">
                        <div className="truncate" title={service.serviceOffered.join(', ')}>
                          {service.serviceOffered.join(', ')}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-right font-semibold text-green-600">
                        KSh {service.amountPaid?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="py-4 px-4">{service.attendant}</TableCell>
                      <TableCell className="py-4 px-4 text-sm text-gray-600">
                        {service.supervisorName || 'N/A'}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-center">
                        <Button
                          onClick={() => handlePayClick(service)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Pay
                        </Button>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => handleEditActiveService(service)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              onClick={() => handleDeleteActiveService(service)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Completed Services Table */}
      <Card className="border-l-4 border-l-green-500 bg-green-50/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-green-600 text-xl font-bold">
            <Car className="h-5 w-5" />
            Completed Services
          </CardTitle>
          <CardDescription className="text-gray-600 text-sm mt-1">
            Services that have been completed and paid for
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Search and Filter Controls */}
          <div className="p-6 border-b bg-gray-50/50">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by registration, model, or service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-full sm:w-32 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Payment">All Payment</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Mpesa">M-Pesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden">
            {filteredCompletedServices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground p-4">
                <div className="text-6xl mb-4">✅</div>
                <div className="text-lg font-semibold mb-2">No Completed Services</div>
                <div className="text-sm mb-2">Completed services will appear here</div>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {filteredCompletedServices.map((record) => (
                  <div key={record.id} className="bg-white border border-green-200 rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-green-800">{record.registrationNumber}</div>
                      <span className="text-xs text-gray-500">{formatDate(record.date)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="font-medium text-gray-600">Model:</span> {record.carModel}</div>
                      <div><span className="font-medium text-gray-600">Type:</span> {record.vehicleType}</div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-600">Service:</span> {record.serviceOffered || record.services}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-bold text-green-600">KSh {record.amountPaid?.toLocaleString() || 0}</span>
                        <Badge 
                          variant={record.paymentMethod === 'Cash' ? 'default' : 'secondary'}
                          className={`ml-2 ${record.paymentMethod === 'Cash' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                        >
                          {record.paymentMethod}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>👤 {record.attendant}</span>
                        {record.supervisorName && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            📝 {record.supervisorName}
                          </span>
                        )}
                      </div>
                    </div>
                    {record.mpesaCode && (
                      <div className="text-sm font-mono text-gray-600">
                        M-Pesa: {record.mpesaCode}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold py-4 px-4">Date</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Registration</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Model</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Vehicle Type</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Service</TableHead>
                  <TableHead className="font-semibold py-4 px-4 text-right">Amount</TableHead>
                  <TableHead className="font-semibold py-4 px-4 text-center">Payment</TableHead>
                  <TableHead className="font-semibold py-4 px-4 text-center">M-Pesa Code</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Attendant</TableHead>
                  <TableHead className="font-semibold py-4 px-4">Supervisor</TableHead>
                  <TableHead className="font-semibold py-4 px-4 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompletedServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      <div className="text-6xl mb-4">✅</div>
                      <div className="text-lg font-semibold mb-2">No Completed Services</div>
                      <div className="text-sm mb-2">Completed services will appear here</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompletedServices.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium py-4 px-4">{formatDate(record.date)}</TableCell>
                      <TableCell className="font-medium py-4 px-4">{record.registrationNumber}</TableCell>
                      <TableCell className="py-4 px-4">{record.carModel}</TableCell>
                      <TableCell className="py-4 px-4">{record.vehicleType}</TableCell>
                      <TableCell className="py-4 px-4 max-w-xs">
                        <div className="truncate" title={record.serviceOffered || record.services}>
                          {record.serviceOffered || record.services}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-right font-semibold text-green-600">
                        KSh {record.amountPaid?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-center">
                        <Badge 
                          variant={record.paymentMethod === 'Cash' ? 'default' : 'secondary'}
                          className={record.paymentMethod === 'Cash' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                        >
                          {record.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-center font-mono text-sm">
                        {record.mpesaCode || '-'}
                      </TableCell>
                      <TableCell className="py-4 px-4">{record.attendant}</TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                            {record.supervisorName?.charAt(0) || record.supervisorAccount?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{record.supervisorName || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{record.supervisorAccount || 'No account'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRecord(record)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRecord(record.id)}
                              disabled={deletingRecordId === record.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingRecordId === record.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      {/* Add Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <CardHeader className="relative border-b px-6 pt-6 pb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="flex items-center gap-2 text-gray-900 text-xl font-bold">
                <Plus className="h-5 w-5" />
                {editingRecord ? 'Edit Car Wash Service' : 'Add New Car Wash Service'}
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm mt-1">
                Record details of the car wash service provided
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => {
                        handleInputChange('date', e.target.value);
                      }}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber" className="text-sm font-medium text-gray-700">
                      Registration Number *
                    </Label>
                    <Input
                      id="registrationNumber"
                      placeholder="e.g., KCA 123A"
                      value={formData.registrationNumber}
                      onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carModel" className="text-sm font-medium text-gray-700">
                      Car Model *
                    </Label>
                    <Input
                      id="carModel"
                      placeholder="e.g., Toyota Camry"
                      value={formData.carModel}
                      onChange={(e) => handleInputChange('carModel', e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleType" className="text-sm font-medium text-gray-700">
                      Vehicle Type *
                    </Label>
                    <Select
                      value={formData.vehicleType}
                      onValueChange={(value) => handleInputChange('vehicleType', value)}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Saloon">Saloon</SelectItem>
                        <SelectItem value="4*4/SUV">4*4/SUV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceOffered" className="text-sm font-medium text-gray-700">
                      Services Offered * (Select multiple)
                    </Label>
                    <div className="relative" ref={serviceDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className={formData.serviceOffered.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                            {formData.serviceOffered.length > 0 
                              ? `${formData.serviceOffered.length} service(s) selected` 
                              : "Select services"
                            }
                          </span>
                          {formData.serviceOffered.length > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                              {formData.serviceOffered.length}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`h-4 w-4 opacity-50 transition-transform ${isServiceDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isServiceDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          <div className="p-1">
                            {loadingServices ? (
                              <div className="p-2 text-center text-sm text-gray-500">
                                Loading services...
                              </div>
                            ) : availableServices.length === 0 ? (
                              <div className="p-2 text-center text-sm text-gray-500">
                                No services available. Please add services in Settings.
                              </div>
                            ) : (
                              availableServices.map((service) => (
                              <div 
                                key={service} 
                                className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded-sm"
                                onClick={() => handleServiceToggle(service)}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.serviceOffered.includes(service)}
                                  onChange={() => handleServiceToggle(service)}
                                  className="rounded border-gray-300 text-primary focus:ring-primary"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-sm text-gray-700">{service}</span>
                              </div>
                              ))
                            )}
                            <div className="border-t pt-2 mt-2">
                              <button
                                type="button"
                                onClick={() => setIsServiceDropdownOpen(false)}
                                className="w-full text-center py-2 text-sm text-primary hover:bg-gray-100 rounded"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {formData.serviceOffered.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Selected: {formData.serviceOffered.join(', ')}
                      </div>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="attendant" className="text-sm font-medium text-gray-700">
                      Attendant *
                    </Label>
                    <Select
                      value={formData.attendant}
                      onValueChange={(value) => handleInputChange('attendant', value)}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select attendant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jacktone Asinuli">Jacktone Asinuli</SelectItem>
                        <SelectItem value="Celeb Nyogesa">Celeb Nyogesa</SelectItem>
                        <SelectItem value="Nelson Simiyo">Nelson Simiyo</SelectItem>
                        <SelectItem value="Mutua Frecon">Mutua Frecon</SelectItem>
                        <SelectItem value="Amos Mokua">Amos Mokua</SelectItem>
                        <SelectItem value="Victor Onyango">Victor Onyango</SelectItem>
                        <SelectItem value="Howard Ruenya">Howard Ruenya</SelectItem>
                        <SelectItem value="Japeth Musyoka">Japeth Musyoka</SelectItem>
                        <SelectItem value="Boneuture Okot">Boneuture Okot</SelectItem>
                        <SelectItem value="Jairus Esichupa">Jairus Esichupa</SelectItem>
                        <SelectItem value="Chris Okeno">Chris Okeno</SelectItem>
                        <SelectItem value="Alex Utti Mwilu">Alex Utti Mwilu</SelectItem>
                        <SelectItem value="Zudin Odida">Zudin Odida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amountPaid" className="text-sm font-medium text-gray-700">
                      Amount (KSh) *
                    </Label>
                    <Input
                      id="amountPaid"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Enter amount"
                      value={formData.amountPaid}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        handleInputChange('amountPaid', value);
                      }}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supervisor" className="text-sm font-medium text-gray-700">
                      Supervisor (Recorded By) *
                    </Label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{user?.email || 'No email'}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This record will be attributed to your supervisor account
                    </p>
                  </div>

                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    size="default"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingRecord ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        {editingRecord ? 'Update Service' : 'Add Service'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedActiveService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="relative border-b px-6 pt-6 pb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPaymentForm(false);
                  setSelectedActiveService(null);
                  setIsPaymentSubmitting(false);
                  setPaymentFormData({
                    amountPaid: '',
                    paymentMethod: '',
                    mpesaCode: ''
                  });
                }}
                className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="flex items-center gap-2 text-green-600 text-xl font-bold">
                <DollarSign className="h-5 w-5" />
                Process Payment
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm mt-1">
                Enter payment details for service completion
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Service Details Display */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Service Details:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Registration:</span> {selectedActiveService.registrationNumber}</div>
                  <div><span className="font-medium">Model:</span> {selectedActiveService.carModel}</div>
                  <div><span className="font-medium">Vehicle Type:</span> {selectedActiveService.vehicleType}</div>
                  <div><span className="font-medium">Attendant:</span> {selectedActiveService.attendant}</div>
                </div>
                <div className="mt-2">
                  <span className="font-medium text-sm">Services:</span>
                  <div className="text-sm text-gray-600">{selectedActiveService.serviceOffered.join(', ')}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span className="font-medium text-sm">Recorded by:</span>
                      <div className="text-sm text-gray-600">{user?.name || 'Unknown'} ({user?.email || 'No email'})</div>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Amount to Pay (KSh)
                  </Label>
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-md border border-green-200">
                    <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">
                      KSh
                    </div>
                    <div>
                      <p className="font-bold text-lg text-green-800">{paymentFormData.amountPaid}</p>
                      <p className="text-xs text-green-600">Amount from service record</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">
                    Payment Method *
                  </Label>
                  <Select 
                    value={paymentFormData.paymentMethod} 
                    onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, paymentMethod: value as 'Cash' | 'Mpesa' }))}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Mpesa">M-Pesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentFormData.paymentMethod === 'Mpesa' && (
                  <div className="space-y-2">
                    <Label htmlFor="mpesaCode" className="text-sm font-medium text-gray-700">
                      M-Pesa Transaction Code *
                    </Label>
                    <Input
                      id="mpesaCode"
                      placeholder="Enter M-Pesa transaction code"
                      value={paymentFormData.mpesaCode}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, mpesaCode: e.target.value }))}
                      className="h-10 text-sm"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    size="default"
                    disabled={isPaymentSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white h-10 px-6 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPaymentSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Complete Payment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}

export function CarWashRecordForm({ onAddRecord }: CarWashRecordFormProps) {
  // Keep the original form for backward compatibility
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    registrationNumber: '',
    carModel: '',
    services: '',
    amountPaid: '',
    paymentMethod: '' as 'Cash' | 'Mpesa' | '',
    attendant: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      if (!formData.registrationNumber || !formData.carModel || !formData.services || 
          !formData.amountPaid || !formData.paymentMethod || !formData.attendant) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      const now = new Date();
      const record: Omit<CarWashRecord, 'id' | 'time' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        services: formData.services,
        vehicleType: '', // Not used in this legacy form
        serviceOffered: '', // Not used in this legacy form
        amountPaid: parseFloat(formData.amountPaid) || 0, // Record the agreed amount
        paymentMethod: formData.paymentMethod as 'Cash' | 'Mpesa',
        date: now.toLocaleDateString(),
        status: 'active' as 'active' | 'completed'
      };

      await onAddRecord(record);
      
      // Reset form
      setFormData({
        registrationNumber: '',
        carModel: '',
        services: '',
        amountPaid: '',
        paymentMethod: '' as 'Cash' | 'Mpesa' | '',
        attendant: ''
      });
      
      toast({
        title: "Record Added",
        description: "Car wash record has been successfully recorded.",
      });
    } catch (error) {
      console.error('Error adding record:', error);
      toast({
        title: "Error Adding Record",
        description: "Failed to add record. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground">
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Car Wash Record
        </CardTitle>
        <CardDescription className="text-primary-foreground/80">
          Record details of the car wash service provided
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Registration Number
              </Label>
              <Input
                id="registrationNumber"
                placeholder="e.g., KCA 123A"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carModel">Car Model</Label>
              <Input
                id="carModel"
                placeholder="e.g., Toyota Camry"
                value={formData.carModel}
                onChange={(e) => handleInputChange('carModel', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountPaid" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Amount Paid (KSh)
              </Label>
              <Input
                id="amountPaid"
                type="number"
                placeholder="0.00"
                value={formData.amountPaid}
                onChange={(e) => handleInputChange('amountPaid', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Mpesa">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendant" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Attempt
              </Label>
              <Input
                id="attendant"
                placeholder="Person name"
                value={formData.attendant}
                onChange={(e) => handleInputChange('attendant', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="services">Services Offered</Label>
            <Textarea
              id="services"
              placeholder="e.g., Exterior wash, Interior cleaning, Waxing..."
              value={formData.services}
              onChange={(e) => handleInputChange('services', e.target.value)}
              className="min-h-[80px] transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Record
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}