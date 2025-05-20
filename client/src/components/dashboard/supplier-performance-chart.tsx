import { ChartCard } from "@/components/stats/chart-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SupplierRating } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LabelList
} from 'recharts';

interface PerformanceData {
  category: string;
  value: number;
}

export function SupplierPerformanceChart() {
  const [timeRange, setTimeRange] = useState("12");
  
  const { data: ratingsData, isLoading, error } = useQuery<SupplierRating[]>({
    queryKey: ['/api/ratings'],
  });
  
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  
  useEffect(() => {
    if (ratingsData) {
      console.log("Fetched supplier ratings:", ratingsData);
      
      // Calculate average ratings
      const hseSum = ratingsData.reduce((sum, rating) => sum + (rating.hseRating || 0), 0);
      const hseAvg = ratingsData.length > 0 ? hseSum / ratingsData.length : 0;
      
      const commSum = ratingsData.reduce((sum, rating) => sum + (rating.communicationRating || 0), 0);
      const commAvg = ratingsData.length > 0 ? commSum / ratingsData.length : 0;
      
      const compSum = ratingsData.reduce((sum, rating) => sum + (rating.competencyRating || 0), 0);
      const compAvg = ratingsData.length > 0 ? compSum / ratingsData.length : 0;
      
      const timeSum = ratingsData.reduce((sum, rating) => sum + (rating.onTimeRating || 0), 0);
      const timeAvg = ratingsData.length > 0 ? timeSum / ratingsData.length : 0;
      
      const serviceSum = ratingsData.reduce((sum, rating) => sum + (rating.serviceRating || 0), 0);
      const serviceAvg = ratingsData.length > 0 ? serviceSum / ratingsData.length : 0;
      
      setPerformanceData([
        { category: "HSE", value: parseFloat(hseAvg.toFixed(1)) },
        { category: "Communication", value: parseFloat(commAvg.toFixed(1)) },
        { category: "Competency", value: parseFloat(compAvg.toFixed(1)) },
        { category: "On-Time", value: parseFloat(timeAvg.toFixed(1)) },
        { category: "Service", value: parseFloat(serviceAvg.toFixed(1)) },
      ]);
    }
  }, [ratingsData, timeRange]);
  
  if (error) {
    console.error("Error loading supplier ratings:", error);
  }
  
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
      ) : error ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-red-500">Error loading performance data</p>
        </div>
      ) : (
        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={performanceData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis domain={[0, 5]} />
              <Tooltip 
                formatter={(value) => [`${value}/5`, 'Rating']}
                labelFormatter={(label) => `${label} Performance`}
              />
              <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="value" position="top" formatter={(value) => `${value}/5`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
