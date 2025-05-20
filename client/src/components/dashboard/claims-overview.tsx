import { ChartCard } from "@/components/stats/chart-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PieChart, 
  Pie, 
  ResponsiveContainer, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

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

interface ChartData {
  name: string;
  value: number;
  count: number;
  color: string;
}

export function ClaimsOverview() {
  const [viewType, setViewType] = useState("all");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });
  
  const claimsData = data?.claimsAnalytics;
  
  useEffect(() => {
    if (claimsData) {
      console.log("Claims data loaded:", claimsData);
      setChartData([
        {
          name: "Material Claims",
          value: claimsData.byType.material.value,
          count: claimsData.byType.material.count,
          color: "#ef4444" // red-500
        },
        {
          name: "Service Claims",
          value: claimsData.byType.service.value,
          count: claimsData.byType.service.count,
          color: "#3b82f6" // blue-500
        },
        {
          name: "HSE Claims",
          value: claimsData.byType.hse.value,
          count: claimsData.byType.hse.count,
          color: "#eab308" // yellow-500
        }
      ]);
    }
  }, [claimsData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-border">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">Value: <span className="font-medium">€{data.value.toLocaleString()}</span></p>
          <p className="text-sm">Count: <span className="font-medium">{data.count} claims</span></p>
        </div>
      );
    }
    return null;
  };
  
  const formatEuro = (value: number) => `€${value.toLocaleString()}`;
  
  if (error) {
    console.error("Error loading claims data:", error);
  }
  
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
      ) : error ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-red-500">Error loading claims data</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col justify-center items-center h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-2">
              <div className="text-xl font-bold text-foreground">€{claimsData.totalValue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Claims Value</div>
            </div>
          </div>
          
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-foreground">Material Claims</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold">€{claimsData.byType.material.value.toLocaleString()}</span>
                <div className="text-xs text-muted-foreground">{claimsData.byType.material.count} claims</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm text-foreground">Service Claims</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold">€{claimsData.byType.service.value.toLocaleString()}</span>
                <div className="text-xs text-muted-foreground">{claimsData.byType.service.count} claims</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm text-foreground">HSE Claims</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold">€{claimsData.byType.hse.value.toLocaleString()}</span>
                <div className="text-xs text-muted-foreground">{claimsData.byType.hse.count} claims</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
              <div className="flex items-center">
                <span className="text-sm font-medium text-foreground">Total</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold">€{claimsData.totalValue.toLocaleString()}</span>
                <div className="text-xs text-muted-foreground">{claimsData.total} claims</div>
              </div>
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
