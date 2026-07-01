import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Loader2, 
  User, 
  Mail, 
  Calendar, 
  Settings as SettingsIcon,
  Users,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  Plus,
  Car,
  X
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AppSettings {
  availableServices?: string[];
}

interface User {
  userId: string;
  email: string;
  name: string;
  role: 'manager' | 'supervisor';
  createdAt?: any;
  lastLogin?: any;
  isActive?: boolean;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    availableServices: []
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [addingService, setAddingService] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadSettings();
    // Only load users for managers
    if (user?.role === 'manager') {
      loadUsers();
    }
  }, [user?.role]);


  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSettings();
      
      if (response.success && response.data) {
        setSettings({
          availableServices: response.data.availableServices || []
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await apiService.getUsers();
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        throw new Error(response.message || 'Failed to load users');
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      toast({
        title: "Error Loading Users",
        description: "Could not load user list. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await apiService.updateUserRole(userId, newRole);
      
      if (response.success) {
        setUsers(prev => prev.map(u => 
          u.userId === userId ? { ...u, role: newRole as 'manager' | 'supervisor' } : u
        ));
        toast({
          title: "Role Updated",
          description: `User role has been changed to ${newRole}.`,
        });
      } else {
        throw new Error(response.message || 'Failed to update role');
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      toast({
        title: "Error Updating Role",
        description: err instanceof Error ? err.message : 'Failed to update user role',
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const response = await apiService.deleteUser(userId);
      
      if (response.success) {
        setUsers(prev => prev.filter(u => u.userId !== userId));
        toast({
          title: "User Deleted",
          description: `${userName} has been removed from the system.`,
        });
      } else {
        throw new Error(response.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      toast({
        title: "Error Deleting User",
        description: err instanceof Error ? err.message : 'Failed to delete user',
        variant: "destructive"
      });
    }
  };

  const handleAddService = async () => {
    if (!newServiceName.trim()) {
      toast({
        title: "Invalid Service Name",
        description: "Please enter a service name.",
        variant: "destructive"
      });
      return;
    }

    try {
      setAddingService(true);
      const response = await apiService.addService(newServiceName.trim());
      
      if (response.success && response.data) {
        setSettings(prev => ({
          ...prev,
          availableServices: response.data?.availableServices || []
        }));
        setNewServiceName('');
        toast({
          title: "Service Added",
          description: `"${newServiceName.trim()}" has been added to available services.`,
        });
      } else {
        throw new Error(response.message || 'Failed to add service');
      }
    } catch (err) {
      console.error('Failed to add service:', err);
      toast({
        title: "Error Adding Service",
        description: err instanceof Error ? err.message : 'Failed to add service',
        variant: "destructive"
      });
    } finally {
      setAddingService(false);
    }
  };

  const handleRemoveService = async (serviceName: string) => {
    try {
      const response = await apiService.removeService(serviceName);
      
      if (response.success && response.data) {
        setSettings(prev => ({
          ...prev,
          availableServices: response.data?.availableServices || []
        }));
        toast({
          title: "Service Removed",
          description: `"${serviceName}" has been removed from available services.`,
        });
      } else {
        throw new Error(response.message || 'Failed to remove service');
      }
    } catch (err) {
      console.error('Failed to remove service:', err);
      toast({
        title: "Error Removing Service",
        description: err instanceof Error ? err.message : 'Failed to remove service',
        variant: "destructive"
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Never';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Settings & User Management</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">Manage system settings and user accounts</p>
        </div>
        <div className="flex-shrink-0">
          <Button onClick={loadUsers} variant="outline" size="sm" className="text-xs sm:text-sm w-full sm:w-auto" disabled={usersLoading}>
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Settings Cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-1 max-w-md">
        {/* Current User Info */}
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 md:px-6 md:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Your Account
            </CardTitle>
            <div className="p-1.5 md:p-2 rounded-lg bg-green-50">
              <User className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Not available'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || 'Not available'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={user?.role === 'manager' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {user?.role || 'User'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Management */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4">
          <CardTitle className="flex items-center text-sm sm:text-base">
            <Car className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-600" />
            Service Management
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage available car wash services</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
          {/* Add New Service */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="new-service" className="text-sm font-medium text-gray-700">
                  Add New Service
                </Label>
                <Input
                  id="new-service"
                  placeholder="e.g., Bullet Washing, Body Washing"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddService()}
                  className="mt-1"
                />
              </div>
              <div className="flex-shrink-0 flex items-end">
                <Button 
                  onClick={handleAddService}
                  disabled={addingService || !newServiceName.trim()}
                  className="w-full sm:w-auto"
                >
                  {addingService ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Services List */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Available Services ({settings.availableServices?.length || 0})
            </h3>
            
            {settings.availableServices && settings.availableServices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {settings.availableServices.map((service, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                      {service}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveService(service)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">No services available</p>
                <p className="text-muted-foreground text-xs mt-1">Add your first service above</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Management - Only for Managers */}
      {user?.role === 'manager' && (
        <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-4">
          <CardTitle className="flex items-center text-sm sm:text-base">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-600" />
            User Management
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage user accounts, roles, and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="block lg:hidden">
                <div className="space-y-3">
                  {users.map((userData) => (
                    <div key={userData.userId} className="border border-purple-200 rounded-lg p-3 bg-purple-50/30 hover:bg-purple-50/50 transition-colors">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">{userData.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{userData.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {userData.isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Role</Label>
                          <Select
                            value={userData.role}
                            onValueChange={(newRole) => handleRoleChange(userData.userId, newRole)}
                            disabled={userData.userId === user?.userId}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Last Login</Label>
                          <p className="text-xs text-gray-600 truncate">{formatDate(userData.lastLogin)}</p>
                        </div>
                      </div>
                      
                      {userData.userId !== user?.userId && (
                        <div className="flex justify-end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="mx-4 max-w-sm">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-sm">Delete User Account</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs">
                                  Are you sure you want to delete <strong>{userData.name}</strong>? 
                                  This action cannot be undone and will permanently remove their account and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(userData.userId, userData.name)}
                                  className="bg-red-600 hover:bg-red-700 text-xs"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userData) => (
                      <TableRow key={userData.userId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{userData.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {userData.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={userData.role}
                            onValueChange={(newRole) => handleRoleChange(userData.userId, newRole)}
                            disabled={userData.userId === user?.userId}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatDate(userData.lastLogin)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {userData.isActive ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-green-600 font-medium text-sm">Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-500 text-sm">Inactive</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {userData.userId !== user?.userId && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete <strong>{userData.name}</strong>? 
                                      This action cannot be undone and will permanently remove their account and all associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(userData.userId, userData.name)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default SettingsPage;