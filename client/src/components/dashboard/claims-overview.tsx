import { ChartCard } from "@/components/stats/chart-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface ClaimsAnalytics {
  total: number;
  totalValue: number;
  byType: {
    material: { count: number; value: number };
    service: { count: number; value: number };
    hse: { count: number; value: number };
  };
}

interface DashboardStats {
  metrics: {
    activeSuppliers: number;
    activeAgreements: number;
    openClaims: number;
    recentTickets: number;
    pendingApproval: number;
  };
  claimsAnalytics: ClaimsAnalytics;
  topSuppliers: any[];
}

export function ClaimsOverview() {
  const [viewType, setViewType] = useState("all");
  
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });
  
  const claimsData = data?.claimsAnalytics;
  
  return (
    <ChartCard 
      title="Claims Overview" 
      action={
        <Select value={viewType} onValueChange={setViewType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Claims</SelectItem>
            <SelectItem value="open">Open Claims</SelectItem>
            <SelectItem value="closed">Closed Claims</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {isLoading || !claimsData ? (
        <div className="space-y-2 py-6">
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col justify-center items-center">
            <div className="relative h-40 w-40">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-32 w-32 rounded-full border-8 border-primary opacity-30"></div>
                
                {/* Material claims segment (red) */}
                <div 
                  className="absolute top-0 right-0 h-32 w-32 rounded-full border-8 border-transparent border-t-red-500 border-r-red-500" 
                  style={{ 
                    transform: `rotate(${(claimsData.byType.material.value / claimsData.totalValue) * 360}deg)` 
                  }}
                ></div>
                
                {/* Service claims segment (blue) */}
                <div 
                  className="absolute top-0 left-0 h-32 w-32 rounded-full border-8 border-transparent border-b-blue-500 border-l-blue-500" 
                  style={{ 
                    transform: `rotate(${(claimsData.byType.service.value / claimsData.totalValue) * 360}deg)` 
                  }}
                ></div>
                
                {/* HSE claims segment (yellow) */}
                <div 
                  className="absolute bottom-0 h-32 w-32 rounded-full border-8 border-transparent border-b-yellow-500" 
                  style={{ 
                    transform: `rotate(${(claimsData.byType.hse.value / claimsData.totalValue) * 360}deg)` 
                  }}
                ></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">€{claimsData.totalValue.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Value</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col justify-center">
            <div className="mb-4">
              <div className="flex items-center mb-1">
                <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-foreground">Material Claims</span>
                <span className="ml-auto text-sm font-semibold">€{claimsData.byType.material.value.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">{claimsData.byType.material.count} open claims</div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center mb-1">
                <div className="h-3 w-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm text-foreground">Service Claims</span>
                <span className="ml-auto text-sm font-semibold">€{claimsData.byType.service.value.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">{claimsData.byType.service.count} open claims</div>
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <div className="h-3 w-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm text-foreground">HSE Claims</span>
                <span className="ml-auto text-sm font-semibold">€{claimsData.byType.hse.value.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">{claimsData.byType.hse.count} open claims</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-right">
        <Button variant="link" size="sm" asChild>
          <a href="/claims">View all claims</a>
        </Button>
      </div>
    </ChartCard>
  );
}
