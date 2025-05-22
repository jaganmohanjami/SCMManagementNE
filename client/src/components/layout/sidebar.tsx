import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  BarChart4, 
  Building2, 
  FileSpreadsheet, 
  Ticket, 
  AlertTriangle, 
  Star, 
  Users, 
  FileBarChart2,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  allowed?: boolean;
}

function SidebarLink({ href, icon, label, active, allowed = true }: SidebarLinkProps) {
  if (!allowed) {
    return null;
  }
  
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center py-2 px-4 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
          active ? 
            "bg-[#0063B1]/10 border-l-4 border-[#0063B1] text-[#0063B1] font-medium" :
            "text-foreground hover:text-[#0063B1]"
        )}
      >
        <span className="mr-3 text-lg">{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isPurchasing = user.role === "purchasing";
  const isOperations = user.role === "operations";
  const isAccounting = user.role === "accounting";
  const isLegal = user.role === "legal";
  const isManagement = user.role === "management";
  const isSupplier = user.role === "supplier";
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <aside className="w-64 h-full bg-white dark:bg-gray-900 shadow-md fixed left-0 top-0 z-30 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b-2 border-[#0063B1]">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-md bg-[#0063B1] flex items-center justify-center text-white font-bold text-xl">
            NE
          </div>
          <div className="ml-3">
            <h1 className="text-[#0063B1] font-semibold text-lg">Neptune Energy</h1>
            <p className="text-muted-foreground text-xs">SCM Supplier Management</p>
          </div>
        </div>
      </div>
      
      <div className="py-4">
        <div className="px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">
          Main
        </div>
        
        <SidebarLink 
          href="/" 
          icon={<BarChart4 size={18} />} 
          label="Dashboard" 
          active={location === "/"} 
        />
        
        <SidebarLink 
          href="/suppliers" 
          icon={<Building2 size={18} />} 
          label="Suppliers" 
          active={location.startsWith("/suppliers")}
          allowed={isPurchasing || isManagement} 
        />
        
        <SidebarLink 
          href="/agreements" 
          icon={<FileSpreadsheet size={18} />} 
          label="Agreements" 
          active={location.startsWith("/agreements")}
          allowed={isPurchasing || isManagement || isSupplier} 
        />
        
        <SidebarLink 
          href="/tickets" 
          icon={<Ticket size={18} />} 
          label="Service Tickets" 
          active={location.startsWith("/tickets")} 
        />
        
        <SidebarLink 
          href="/claims" 
          icon={<AlertTriangle size={18} />} 
          label="Claims" 
          active={location.startsWith("/claims")}
          allowed={isLegal || isPurchasing || isManagement || isSupplier} 
        />
        
        <SidebarLink 
          href="/ratings" 
          icon={<Star size={18} />} 
          label={isSupplier ? "Job Ratings" : "Supplier Ratings"} 
          active={location.startsWith("/ratings")}
          allowed={isPurchasing || isOperations || isManagement || isSupplier} 
        />
        
        <div className="px-4 py-2 mt-4 text-xs text-muted-foreground uppercase tracking-wider">
          Administration
        </div>
        
        <SidebarLink 
          href="/users" 
          icon={<Users size={18} />} 
          label="User Management" 
          active={location.startsWith("/users")}
          allowed={isPurchasing} 
        />
        
        <SidebarLink 
          href="/reports" 
          icon={<FileBarChart2 size={18} />} 
          label="Reports" 
          active={location.startsWith("/reports")}
          allowed={isPurchasing || isManagement} 
        />
      </div>
      
      <div className="absolute bottom-0 w-full border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            className="ml-auto text-muted-foreground hover:text-foreground"
            title="Logout"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
