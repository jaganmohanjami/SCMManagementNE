import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Ticket, Eye, Edit, CheckSquare, XSquare, Download } from "lucide-react";
import { Link } from "wouter";
import { DataTable, Column } from "@/components/tables/data-table";
import { ServiceTicket, Supplier, Project } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ServiceTicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const isOperations = user?.role === "operations";
  const isSupplier = user?.role === "supplier";

  const { data: tickets = [], isLoading } = useQuery<ServiceTicket[]>({
    queryKey: ['/api/tickets'],
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

  const handleApproveTicket = async (id: number) => {
    try {
      await apiRequest("PUT", `/api/tickets/${id}`, { status: "approved" });
      toast({
        title: "Ticket approved",
        description: "The service ticket has been approved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve ticket",
        variant: "destructive",
      });
    }
  };

  const handleRejectTicket = async (id: number) => {
    try {
      await apiRequest("PUT", `/api/tickets/${id}`, { status: "rejected" });
      toast({
        title: "Ticket rejected",
        description: "The service ticket has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject ticket",
        variant: "destructive",
      });
    }
  };

  const filteredTickets = tickets.filter(
    (ticket) => {
      const matchesSearch = 
        ticket.ticketNumber.toLowerCase().includes(search.toLowerCase());
      
      const matchesSupplier = !supplierFilter || ticket.supplierId === parseInt(supplierFilter);
      const matchesStatus = !statusFilter || ticket.status === statusFilter;
      
      // If user is a supplier, only show their tickets
      if (isSupplier && user?.companyId) {
        return matchesSearch && matchesStatus && ticket.supplierId === user.companyId;
      }
      
      return matchesSearch && matchesSupplier && matchesStatus;
    }
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "submitted":
        return <Badge variant="secondary">Submitted</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const ticketColumns: Column<ServiceTicket>[] = [
    {
      header: "Ticket #",
      accessorKey: "ticketNumber",
      cell: (row) => (
        <div className="flex items-center">
          <Ticket className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-primary">{row.ticketNumber}</span>
        </div>
      ),
    },
    {
      header: "Project",
      accessorKey: "projectId",
      cell: (row) => getProjectName(row.projectId),
    },
    {
      header: "Supplier",
      accessorKey: "supplierId",
      cell: (row) => getSupplierName(row.supplierId),
    },
    {
      header: "Date Created",
      accessorKey: "dateCreated",
      cell: (row) => format(new Date(row.dateCreated), "MMM d, yyyy"),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => getStatusBadge(row.status),
    },
    {
      header: "Total Value",
      accessorKey: "totalValue",
      cell: (row) => (
        <span className="font-medium">
          {typeof row.totalValue === 'number' 
            ? `€${row.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
            : '€0.00'}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (row) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/tickets/${row.id}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Link>
          </Button>
          
          {(isSupplier && row.status === "draft") && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/tickets/${row.id}`}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
          )}
          
          {isOperations && row.status === "submitted" && (
            <>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleApproveTicket(row.id)}
              >
                <CheckSquare className="h-4 w-4 text-green-600" />
                <span className="sr-only">Approve</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleRejectTicket(row.id)}
              >
                <XSquare className="h-4 w-4 text-red-600" />
                <span className="sr-only">Reject</span>
              </Button>
            </>
          )}
          
          {row.status === "approved" && (
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
              <span className="sr-only">Download</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Service Tickets">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Service Delivery Tickets</h1>
          <p className="text-muted-foreground">Create and manage service delivery tickets</p>
        </div>

        {(isOperations || isSupplier) && (
          <Button asChild>
            <Link href="/tickets/new">
              <Plus className="mr-2 h-4 w-4" /> New Service Ticket
            </Link>
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!isSupplier && (
            <div>
              <Select
                value={supplierFilter}
                onValueChange={setSupplierFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tickets..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={ticketColumns}
        data={filteredTickets}
        loading={isLoading}
        noResults={
          <div className="text-center py-4">
            <Ticket className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-2 text-lg font-semibold">No service tickets found</h3>
            <p className="text-muted-foreground">
              {search || supplierFilter || statusFilter 
                ? "Try adjusting your filters" 
                : "Start by creating a new service ticket"}
            </p>
          </div>
        }
        pagination={{
          pageIndex: 0,
          pageSize: 10,
          pageCount: Math.ceil(filteredTickets.length / 10),
          onPageChange: () => {},
        }}
      />
    </AppLayout>
  );
}
