import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/tables/data-table";
import { SupplierRating, Project } from "@shared/schema";
import { Eye, Send, Calendar, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SupplierRatingsView() {
  const { user } = useAuth();

  // Get only ratings for this supplier
  const { data: ratings = [], isLoading: isLoadingRatings } = useQuery<SupplierRating[]>({
    queryKey: ['/api/ratings'],
    select: (data) => data.filter(rating => rating.supplierId === user?.companyId),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const getProjectName = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.projectName : 'Unknown Project';
  };

  // Star rendering function
  const renderStars = (rating: number) => {
    return (
      <div className="flex text-yellow-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-current" : "stroke-current"}`}
          />
        ))}
      </div>
    );
  };

  const ratingColumns: Column<SupplierRating>[] = [
    {
      header: "Date",
      accessorKey: "ratingDate",
      cell: ({ row }) => format(new Date(row.original.ratingDate), "MMM d, yyyy"),
    },
    {
      header: "Project",
      accessorKey: "projectId",
      cell: ({ row }) => getProjectName(row.original.projectId),
    },
    {
      header: "Overall Rating",
      accessorKey: "overallRating",
      cell: ({ row }) => renderStars(Number(row.original.overallRating) || 0),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="icon" variant="ghost" asChild>
            <Link href={`/ratings/${row.original.id}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View Job Rating</span>
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Job Ratings</CardTitle>
          <CardDescription>
            View your performance ratings for completed jobs and services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link href="/ratings/request">
                <Send className="mr-2 h-4 w-4" /> Request Job Rating
              </Link>
            </Button>
          </div>

          {ratings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-2" />
              <h3 className="text-lg font-semibold mb-1">No Job Ratings Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You don't have any job ratings yet. Request a rating for a job you've completed.
              </p>
              <Button asChild variant="outline">
                <Link href="/ratings/request">
                  <Send className="mr-2 h-4 w-4" /> Request Your First Job Rating
                </Link>
              </Button>
            </div>
          ) : (
            <DataTable columns={ratingColumns} data={ratings} />
          )}
        </CardContent>
      </Card>
    </>
  );
}