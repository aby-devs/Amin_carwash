import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ConnectionStatus } from "./ConnectionStatus";
import { Car, Database, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";



export function Layout() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiService.healthCheck();
    } catch (err) {
      console.error('API health check failed:', err);
      setError('API connection failed');
      toast({
        title: "API Connection Failed",
        description: "Could not connect to the server. Some features may not work.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-16 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-primary to-primary-hover rounded-lg">
                  <Car className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                    AutoWash Pro
                  </h1>
                  <p className="text-xs text-muted-foreground">Car Wash Management</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              )}
              {error && (
                <Button 
                  onClick={checkApiHealth}
                  variant="outline"
                  size="sm"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Retry Connection
                </Button>
              )}
              
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-background">
            <Outlet />
          </main>
        </div>
      </div>
      <ConnectionStatus />
    </SidebarProvider>
  );
}
