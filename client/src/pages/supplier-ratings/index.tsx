import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Star, Eye, Calendar, Send } from "lucide-react";
import { Link } from "wouter";
import { DataTable, Column } from "@/components/tables/data-table";
import { SupplierRating, Supplier, Project } from "@shared/schema";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function SupplierRatingsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  
  const isOperations = user?.role === "operations";
  const isPurchasing = user?.role === "purchasing";
  const isManagement = user?.role === "management";

  const { data: ratings = [], isLoading } = useQuery<SupplierRating[]>({
    queryKey: ['/api/ratings'],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.companyName : 'Unknown Supplier';
  };

  const getProjectName = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.projectName : 'Unknown Project';
  };

  // Filter ratings based on search, supplier, project, and time range
  const filteredRatings = ratings.filter(
    (rating) => {
      // For supplier role, only show their own ratings
      if (user?.role === "supplier" && user?.companyId) {
        if (rating.supplierId !== user.companyId) {
          return false;
        }
      }
      
      const matchesSearch = 
        getSupplierName(rating.supplierId).toLowerCase().includes(search.toLowerCase()) ||
        getProjectName(rating.projectId).toLowerCase().includes(search.toLowerCase());
      
      const matchesSupplier = !supplierFilter || supplierFilter === "all" || rating.supplierId === parseInt(supplierFilter);
      const matchesProject = !projectFilter || projectFilter === "all" || rating.projectId === parseInt(projectFilter);
      
      // Filter by time range
      const ratingDate = new Date(rating.ratingDate);
      const now = new Date();
      
      let inTimeRange = true;
      if (timeRange === '3') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        inTimeRange = ratingDate >= threeMonthsAgo;
      } else if (timeRange === '6') {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        inTimeRange = ratingDate >= sixMonthsAgo;
      } else if (timeRange === '12') {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        inTimeRange = ratingDate >= oneYearAgo;
      }
      
      return matchesSearch && matchesSupplier && matchesProject && inTimeRange;
    }
  );

  // Prepare data for trend chart
  const prepareTrendData = () => {
    // Group by month and calculate averages
    const monthlyData = new Map();
    
    filteredRatings.forEach(rating => {
      const date = new Date(rating.ratingDate);
      const monthYear = format(date, 'MMM yyyy');
      
      if (!monthlyData.has(monthYear)) {
        monthlyData.set(monthYear, {
          month: monthYear,
          hse: [],
          communication: [],
          competency: [],
          onTime: [],
          service: [],
          overall: [],
        });
      }
      
      const entry = monthlyData.get(monthYear);
      entry.hse.push(rating.hseRating || 0);
      entry.communication.push(rating.communicationRating || 0);
      entry.competency.push(rating.competencyRating || 0);
      entry.onTime.push(rating.onTimeRating || 0);
      entry.service.push(rating.serviceRating || 0);
      entry.overall.push(Number(rating.overallRating) || 0);
    });
    
    // Calculate averages
    const result = Array.from(monthlyData.entries()).map(([month, data]) => {
      const calcAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
      
      return {
        month: month,
        hse: Number(calcAvg(data.hse).toFixed(1)),
        communication: Number(calcAvg(data.communication).toFixed(1)),
        competency: Number(calcAvg(data.competency).toFixed(1)),
        onTime: Number(calcAvg(data.onTime).toFixed(1)),
        service: Number(calcAvg(data.service).toFixed(1)),
        overall: Number(calcAvg(data.overall).toFixed(1)),
      };
    });
    
    // Sort by date
    return result.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Prepare data for supplier comparison
  const prepareSupplierComparisonData = () => {
    // Group by supplier and calculate averages
    const supplierData = new Map();
    
    filteredRatings.forEach(rating => {
      const supplierId = rating.supplierId;
      const supplierName = getSupplierName(supplierId).split(' ')[0]; // Use first word to keep chart readable
      
      if (!supplierData.has(supplierName)) {
        supplierData.set(supplierName, {
          name: supplierName,
          hse: [],
          communication: [],
          competency: [],
          onTime: [],
          service: [],
          overall: [],
          count: 0,
        });
      }
      
      const entry = supplierData.get(supplierName);
      entry.hse.push(rating.hseRating || 0);
      entry.communication.push(rating.communicationRating || 0);
      entry.competency.push(rating.competencyRating || 0);
      entry.onTime.push(rating.onTimeRating || 0);
      entry.service.push(rating.serviceRating || 0);
      entry.overall.push(Number(rating.overallRating) || 0);
      entry.count++;
    });
    
    // Calculate averages
    const result = Array.from(supplierData.entries()).map(([name, data]) => {
      const calcAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
      
      return {
        name: name,
        hse: Number(calcAvg(data.hse).toFixed(1)),
        communication: Number(calcAvg(data.communication).toFixed(1)),
        competency: Number(calcAvg(data.competency).toFixed(1)),
        onTime: Number(calcAvg(data.onTime).toFixed(1)),
        service: Number(calcAvg(data.service).toFixed(1)),
        overall: Number(calcAvg(data.overall).toFixed(1)),
        count: data.count,
      };
    });
    
    // Sort by overall rating
    return result.sort((a, b) => b.overall - a.overall);
  };

  const trendData = prepareTrendData();
  const supplierComparisonData = prepareSupplierComparisonData();

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
      cell: (row) => format(new Date(row.ratingDate), "MMM d, yyyy"),
    },
    {
      header: "Supplier",
      accessorKey: "supplierId",
      cell: (row) => getSupplierName(row.supplierId),
    },
    {
      header: "Project",
      accessorKey: "projectId",
      cell: (row) => getProjectName(row.projectId),
    },
    {
      header: "HSE",
      accessorKey: "hseRating",
      cell: (row) => renderStars(row.hseRating || 0),
    },
    {
      header: "Communication",
      accessorKey: "communicationRating",
      cell: (row) => renderStars(row.communicationRating || 0),
    },
    {
      header: "Competency",
      accessorKey: "competencyRating",
      cell: (row) => renderStars(row.competencyRating || 0),
    },
    {
      header: "On-Time",
      accessorKey: "onTimeRating",
      cell: (row) => renderStars(row.onTimeRating || 0),
    },
    {
      header: "Service",
      accessorKey: "serviceRating",
      cell: (row) => renderStars(row.serviceRating || 0),
    },
    {
      header: "Overall",
      accessorKey: "overallRating",
      cell: (row) => <span className="font-medium">{Number(row.overallRating).toFixed(1)}</span>,
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (row) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/ratings/${row.id}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  // For supplier users, show a simplified view
  if (user?.role === "supplier") {
    // Filter ratings for this supplier only
    const supplierRatings = ratings.filter(rating => rating.supplierId === user?.companyId);
    
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
    
    const getProjectName = (projectId: number) => {
      const project = projects.find(p => p.id === projectId);
      return project ? project.projectName : 'Unknown Project';
    };
    
    return (
      <AppLayout title="Job Ratings">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">My Job Ratings</h1>
            <p className="text-muted-foreground">View and request ratings for jobs you've completed</p>
          </div>
          
          <Button asChild>
            <Link href="/ratings/request">
              <Send className="mr-2 h-4 w-4" /> Request Job Rating
            </Link>
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Job Ratings</CardTitle>
            <CardDescription>
              View your performance ratings for completed jobs and services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {supplierRatings.length === 0 ? (
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
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierRatings.map(rating => {
                      // Determine status based on data
                      let status = "Requested";
                      let statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
                      
                      // If it has ratings, it's been rated
                      if (rating.overallRating) {
                        status = "Rated";
                        statusColor = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
                      }
                      
                      // For now, we're showing Accepted if there's a comment from the supplier
                      // This would normally be tracked in the database with a dedicated field
                      if (user?.role === "supplier" && 
                          status === "Rated" && 
                          new Date(rating.ratingDate) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
                        status = "Accepted";
                        statusColor = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
                      }
                      
                      return (
                        <tr key={rating.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-4 px-4">
                            {format(new Date(rating.ratingDate), "MMM d, yyyy")}
                          </td>
                          <td className="py-4 px-4">
                            {getProjectName(rating.projectId)}
                          </td>
                          <td className="py-4 px-4">
                            {rating.overallRating ? renderStars(Number(rating.overallRating) || 0) : "Pending"}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Button size="sm" variant="ghost" asChild>
                              <Link href={`/ratings/${rating.id}`}>
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // For all other roles, show the regular view
  return (
    <AppLayout title="Supplier Ratings">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Supplier Job Ratings</h1>
          <p className="text-muted-foreground">Rate and evaluate supplier performance on specific jobs and services</p>
        </div>

        <div className="flex gap-3">
          {isOperations && (
            <Button asChild>
              <Link href="/ratings/new">
                <Plus className="mr-2 h-4 w-4" /> Add New Rating
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Average ratings over time</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="overall" stroke="#0063B1" strokeWidth={2} />
                <Line type="monotone" dataKey="hse" stroke="#107C10" />
                <Line type="monotone" dataKey="communication" stroke="#00A3E0" />
                <Line type="monotone" dataKey="competency" stroke="#FFB900" />
                <Line type="monotone" dataKey="onTime" stroke="#D83B01" />
                <Line type="monotone" dataKey="service" stroke="#797775" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Supplier Comparison</CardTitle>
            <CardDescription>Average overall performance by supplier</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={supplierComparisonData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="overall" name="Overall" fill="#0063B1" />
                <Bar dataKey="hse" name="HSE" fill="#107C10" />
                <Bar dataKey="communication" name="Communication" fill="#00A3E0" />
                <Bar dataKey="competency" name="Competency" fill="#FFB900" />
                <Bar dataKey="onTime" name="On-Time" fill="#D83B01" />
                <Bar dataKey="service" name="Service" fill="#797775" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Only show supplier filter for non-supplier roles */}
          {user?.role !== "supplier" ? (
            <div>
              <Select
                value={supplierFilter}
                onValueChange={setSupplierFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Your Job Ratings</h3>
              <p className="text-xs text-muted-foreground">Showing ratings for {getSupplierName(user?.companyId || 0)}</p>
            </div>
          )}
          
          <div>
            <Select
              value={projectFilter}
              onValueChange={setProjectFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select
              value={timeRange}
              onValueChange={setTimeRange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="3">Last 3 Months</SelectItem>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search ratings..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Supplier Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={ratingColumns}
            data={filteredRatings}
            loading={isLoading}
            noResults={
              <div className="text-center py-4">
                <Star className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-2 text-lg font-semibold">No ratings found</h3>
                <p className="text-muted-foreground">
                  {search || supplierFilter || projectFilter || timeRange !== 'all'
                    ? "Try adjusting your filters"
                    : isOperations
                      ? "Start by adding a new supplier rating"
                      : "No supplier ratings are currently available"
                  }
                </p>
              </div>
            }
            pagination={{
              pageIndex: 0,
              pageSize: 10,
              pageCount: Math.ceil(filteredRatings.length / 10),
              onPageChange: () => {},
            }}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
