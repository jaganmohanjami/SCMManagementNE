import { ChartCard } from "@/components/stats/chart-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SupplierRating } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface PerformanceData {
  category: string;
  value: number;
}

export function SupplierPerformanceChart() {
  const [timeRange, setTimeRange] = useState("12");
  
  const { data: ratingsData, isLoading } = useQuery<SupplierRating[]>({
    queryKey: ['/api/ratings'],
  });
  
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  
  useEffect(() => {
    if (ratingsData) {
      // Filter ratings by time range if needed
      const filteredRatings = ratingsData;
      
      // Calculate average ratings
      const hseSum = filteredRatings.reduce((sum, rating) => sum + (rating.hseRating || 0), 0);
      const hseAvg = filteredRatings.length > 0 ? hseSum / filteredRatings.length : 0;
      
      const commSum = filteredRatings.reduce((sum, rating) => sum + (rating.communicationRating || 0), 0);
      const commAvg = filteredRatings.length > 0 ? commSum / filteredRatings.length : 0;
      
      const compSum = filteredRatings.reduce((sum, rating) => sum + (rating.competencyRating || 0), 0);
      const compAvg = filteredRatings.length > 0 ? compSum / filteredRatings.length : 0;
      
      const timeSum = filteredRatings.reduce((sum, rating) => sum + (rating.onTimeRating || 0), 0);
      const timeAvg = filteredRatings.length > 0 ? timeSum / filteredRatings.length : 0;
      
      const serviceSum = filteredRatings.reduce((sum, rating) => sum + (rating.serviceRating || 0), 0);
      const serviceAvg = filteredRatings.length > 0 ? serviceSum / filteredRatings.length : 0;
      
      setPerformanceData([
        { category: "HSE", value: hseAvg },
        { category: "Communication", value: commAvg },
        { category: "Competency", value: compAvg },
        { category: "On-Time", value: timeAvg },
        { category: "Service", value: serviceAvg },
      ]);
    }
  }, [ratingsData, timeRange]);
  
  return (
    <ChartCard 
      title="Supplier Performance" 
      action={
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {isLoading ? (
        <div className="space-y-2 py-6">
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : (
        <div className="h-64 flex items-end justify-between py-4 mt-2 border-b border-t border-border">
          {performanceData.map((item) => (
            <div key={item.category} className="flex flex-col items-center w-1/5">
              <div 
                className="bg-primary w-12 rounded-t-md"
                style={{ height: `${(item.value / 5) * 100}%` }}
              ></div>
              <p className="text-xs text-muted-foreground mt-2">{item.category}</p>
              <p className="text-sm font-semibold">{item.value.toFixed(1)}</p>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 text-right">
        <Button variant="link" size="sm" asChild>
          <a href="/ratings">View detailed ratings</a>
        </Button>
      </div>
    </ChartCard>
  );
}
