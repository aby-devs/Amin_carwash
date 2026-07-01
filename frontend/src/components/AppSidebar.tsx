import { Plus, BarChart3, FileText, Users, User, LogOut, Settings, PieChart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const menuItems = [
  { title: "Dashboard", path: "/", icon: BarChart3 },
  { title: "Add Service", path: "/add-record", icon: FileText },
  { title: "Staff Commission", path: "/staff", icon: Users },
  { title: "Reports", path: "/reports", icon: PieChart },
];

const managerMenuItems = [
  { title: "Settings", path: "/settings", icon: Settings },
  { title: "Supervisor Collections", path: "/supervisor-activities", icon: Users },
];

const supervisorMenuItems = [
  { title: "My Daily Stats", path: "/my-stats", icon: BarChart3 },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleMenuClick = () => {
    // Close mobile sidebar when menu item is clicked
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      {/* Add hidden title for accessibility */}
      <h2 className="sr-only">Navigation Menu</h2>
      <SidebarContent className="bg-card border-r">
        {/* Header */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-b`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            {!isCollapsed && (
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                  AutoWash Pro
                </h2>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="py-4">
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full justify-start transition-all duration-200 ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Link to={item.path} onClick={handleMenuClick}> 
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-3">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Manager-specific menu items */}
              {user?.role === 'manager' && managerMenuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full justify-start transition-all duration-200 ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Link to={item.path} onClick={handleMenuClick}> 
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-3">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Supervisor-specific menu items */}
              {user?.role === 'supervisor' && supervisorMenuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full justify-start transition-all duration-200 ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Link to={item.path} onClick={handleMenuClick}> 
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-3">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Profile Section - Bottom */}
        <div className="mt-auto border-t">
          {!isCollapsed ? (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-r from-primary to-primary-hover rounded-lg">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {user?.name || user?.email || 'User'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant={user?.role === 'manager' ? 'default' : 'secondary'}
                            className="text-xs cursor-help"
                          >
                            {user?.role || 'User'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {user?.role === 'manager' 
                              ? 'Manager - Can delete transactions and manage all records'
                              : user?.role === 'supervisor'
                              ? 'Supervisor - Can view and add records, but cannot delete'
                              : 'User - Basic access'
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="p-2">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-primary to-primary-hover rounded-lg">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground p-2"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

      </SidebarContent>
    </Sidebar>
  );
}