import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  CheckCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
  change?: {
    type: "increase" | "decrease" | "neutral";
    value: string;
  };
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  icon, 
  iconColor = "blue",
  change,
  className 
}: MetricCardProps) {
  const getIconColorClass = () => {
    switch (iconColor) {
      case "blue": return "text-primary";
      case "green": return "text-green-600 dark:text-green-500";
      case "red": return "text-red-600 dark:text-red-500";
      case "yellow": return "text-yellow-600 dark:text-yellow-500";
      case "purple": return "text-purple-600 dark:text-purple-500";
      case "gray": return "text-gray-600 dark:text-gray-400";
      default: return "text-primary";
    }
  };
  
  const getChangeIcon = () => {
    switch (change?.type) {
      case "increase": return <TrendingUp className="mr-1 h-4 w-4" />;
      case "decrease": return <TrendingDown className="mr-1 h-4 w-4" />;
      case "neutral": return <Minus className="mr-1 h-4 w-4" />;
      default: return null;
    }
  };
  
  const getChangeColorClass = () => {
    switch (change?.type) {
      case "increase": return "text-green-600 dark:text-green-500";
      case "decrease": return "text-red-600 dark:text-red-500";
      case "neutral": return "text-gray-600 dark:text-gray-400";
      default: return "";
    }
  };
  
  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-muted-foreground font-medium text-sm">{title}</h3>
          <div className={cn("text-xl", getIconColorClass())}>
            {icon}
          </div>
        </div>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
        {change && (
          <p className={cn("text-sm mt-2 flex items-center", getChangeColorClass())}>
            {getChangeIcon()}
            {change.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
