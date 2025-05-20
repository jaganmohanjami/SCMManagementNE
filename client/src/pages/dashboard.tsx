import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { MetricCard } from "@/components/stats/metric-card";
import { ActivityList } from "@/components/activity/activity-list";
import { SupplierPerformanceChart } from "@/components/dashboard/supplier-performance-chart";
import { ClaimsOverview } from "@/components/dashboard/claims-overview";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  AlertTriangle,
  FileSpreadsheet,
  Ticket,
} from "lucide-react";

interface DashboardStats {
  metrics: {
    activeSuppliers: number;
    activeAgreements: number;
    openClaims: number;
    recentTickets: number;
    pendingApproval: number;
  };
  topSuppliers: any[];
  claimsAnalytics: any;
}

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });
  
  const renderWelcomeMessage = () => {
    if (!user) return null;
    
    let message = "";
    let description = "";
    
    switch (user.role) {
      case "purchasing":
        message = "Welcome to Supplier Management";
        description = "Manage suppliers, agreements, and monitor performance data";
        break;
      case "operations":
        message = "Operations Dashboard";
        description = "Approve field tickets and submit job ratings";
        break;
      case "accounting":
        message = "Accounting Dashboard";
        description = "View approved tickets and compare with invoices";
        break;
      case "legal":
        message = "Legal Dashboard";
        description = "Manage and process claims";
        break;
      case "management":
        message = "Management Overview";
        description = "View performance metrics and supplier data";
        break;
      case "supplier":
        message = "Supplier Portal";
        description = "Submit service tickets and view your price list";
        break;
      default:
        message = "Welcome to Supplier Management";
        description = "Neptune Energy SCM System";
    }
    
    return (
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">{message}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
    );
  };
  
  return (
    <AppLayout title="Dashboard">
      {renderWelcomeMessage()}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          <>
            {Array(4).fill(0).map((_, index) => (
              <Skeleton key={index} className="h-[140px] w-full" />
            ))}
          </>
        ) : (
          <>
            <MetricCard 
              title="Active Suppliers" 
              value={stats?.metrics.activeSuppliers || 0}
              icon={<Building2 className="h-6 w-6" />}
              iconColor="blue"
              change={{
                type: "increase",
                value: "+3% from last month"
              }}
            />
            
            <MetricCard 
              title="Open Claims" 
              value={stats?.metrics.openClaims || 0}
              icon={<AlertTriangle className="h-6 w-6" />}
              iconColor="yellow"
              change={{
                type: "increase",
                value: "+2 from last month"
              }}
            />
            
            <MetricCard 
              title="Active Agreements" 
              value={stats?.metrics.activeAgreements || 0}
              icon={<FileSpreadsheet className="h-6 w-6" />}
              iconColor="green"
              change={{
                type: "neutral",
                value: "5 renewals due"
              }}
            />
            
            <MetricCard 
              title="Recent Tickets" 
              value={stats?.metrics.recentTickets || 0}
              icon={<Ticket className="h-6 w-6" />}
              iconColor="blue"
              change={{
                type: "neutral",
                value: `${stats?.metrics.pendingApproval || 0} pending approval`
              }}
            />
          </>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SupplierPerformanceChart />
        <ClaimsOverview />
      </div>
      
      <ActivityList />
    </AppLayout>
  );
}
