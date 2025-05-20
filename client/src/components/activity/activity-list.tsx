import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Ticket, 
  AlertTriangle, 
  FileSpreadsheet, 
  Star, 
  Building2 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  timestamp: string;
  details: any;
  entity: any;
}

export function ActivityList() {
  const { data, isLoading } = useQuery<Activity[]>({
    queryKey: ['/api/activity'],
  });
  
  const getIcon = (activity: Activity) => {
    switch (activity.entityType) {
      case 'serviceTicket':
        return <Ticket className="text-blue-500 h-5 w-5" />;
      case 'claim':
        return <AlertTriangle className="text-yellow-500 h-5 w-5" />;
      case 'agreement':
        return <FileSpreadsheet className="text-green-500 h-5 w-5" />;
      case 'supplierRating':
        return <Star className="text-purple-500 h-5 w-5" />;
      case 'supplier':
        return <Building2 className="text-blue-500 h-5 w-5" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-200" />;
    }
  };
  
  const getActivityText = (activity: Activity) => {
    let text = '';
    const entityName = activity.entity?.companyName 
      || activity.entity?.agreementNumber 
      || activity.entity?.ticketNumber
      || activity.entity?.claimNumber
      || activity.details?.number
      || activity.details?.name
      || `#${activity.entityId}`;
    
    switch (activity.entityType) {
      case 'serviceTicket':
        if (activity.action === 'create') {
          text = `New service ticket ${entityName} was created`;
        } else if (activity.action === 'update') {
          text = `Service ticket ${entityName} was updated`;
        } else if (activity.action === 'submit') {
          text = `Service ticket ${entityName} was submitted for approval`;
        } else if (activity.action === 'approve') {
          text = `Service ticket ${entityName} was approved`;
        } else if (activity.action === 'reject') {
          text = `Service ticket ${entityName} was rejected`;
        }
        break;
      case 'claim':
        if (activity.action === 'create') {
          text = `New claim ${entityName} was filed`;
        } else if (activity.action === 'update') {
          text = `Claim ${entityName} was updated`;
        }
        break;
      case 'agreement':
        if (activity.action === 'create') {
          text = `New agreement ${entityName} was created`;
        } else if (activity.action === 'update') {
          text = `Agreement ${entityName} was updated`;
        }
        break;
      case 'supplierRating':
        if (activity.action === 'create') {
          text = `New supplier rating was submitted for ${activity.entity?.supplierId}`;
        }
        break;
      case 'supplier':
        if (activity.action === 'create') {
          text = `New supplier ${entityName} was added`;
        } else if (activity.action === 'update') {
          text = `Supplier ${entityName} was updated`;
        }
        break;
      default:
        text = `Action ${activity.action} on ${activity.entityType} ${activity.entityId}`;
    }
    
    return text;
  };
  
  const getRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'recently';
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading && (
            <>
              {Array(4).fill(0).map((_, index) => (
                <div key={index} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                </div>
              ))}
            </>
          )}
          
          {data?.map((activity) => (
            <div key={activity.id} className="flex">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                {getIcon(activity)}
              </div>
              <div className="ml-4">
                <p className="text-sm text-foreground">
                  {getActivityText(activity)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
          
          {data && data.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No recent activity</p>
          )}
        </div>
        
        {data && data.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="link" size="sm">
              View more activity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
