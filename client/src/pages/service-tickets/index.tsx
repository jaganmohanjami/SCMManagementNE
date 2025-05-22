import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Ticket, Eye, Edit, CheckSquare, XSquare, Download } from "lucide-react";
import { Link } from "wouter";
import { jsPDF } from "jspdf";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
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

  const [approvalNotes, setApprovalNotes] = useState("");
  const [ticketToAction, setTicketToAction] = useState<{id: number, action: "approve" | "reject"} | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const handleOpenApprovalDialog = (id: number, action: "approve" | "reject") => {
    setTicketToAction({ id, action });
    setApprovalNotes("");
    setApprovalDialogOpen(true);
  };

  const handleApproveTicket = async () => {
    if (!ticketToAction) return;
    
    try {
      await apiRequest("PUT", `/api/tickets/${ticketToAction.id}`, { 
        status: "approved", 
        approvedBy: user?.id,
        dateApproved: new Date().toISOString()
      });
      
      // Store notes in localStorage as a workaround (since we can't modify the DB schema)
      const notesKey = `ticket_${ticketToAction.id}_notes`;
      localStorage.setItem(notesKey, approvalNotes);
      
      toast({
        title: "Ticket approved",
        description: "The service ticket has been approved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      setApprovalDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve ticket",
        variant: "destructive",
      });
    }
  };

  const handleRejectTicket = async () => {
    if (!ticketToAction) return;
    
    try {
      await apiRequest("PUT", `/api/tickets/${ticketToAction.id}`, { 
        status: "rejected"
      });
      
      // Store notes in localStorage as a workaround (since we can't modify the DB schema)
      const notesKey = `ticket_${ticketToAction.id}_notes`;
      localStorage.setItem(notesKey, approvalNotes);
      
      toast({
        title: "Ticket rejected",
        description: "The service ticket has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      setApprovalDialogOpen(false);
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
        return <Badge className="badge-neptune-success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const generatePDF = async (ticket: ServiceTicket) => {
    // Get ticket details
    try {
      // Fetch ticket items
      const itemsRes = await fetch(`/api/tickets/${ticket.id}/items`);
      const items = await itemsRes.json();
      
      // Get supplier and project details
      const supplier = suppliers.find(s => s.id === ticket.supplierId);
      const project = projects.find(p => p.id === ticket.projectId);
      
      // Create PDF document
      const doc = new jsPDF();
      
      // Add Neptune Energy header
      doc.setTextColor(0, 99, 177); // #0063B1
      doc.setFontSize(22);
      doc.text("Neptune Energy", 105, 20, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.text("Service Delivery Ticket", 105, 30, { align: 'center' });
      
      // Ticket info
      doc.setFontSize(12);
      doc.text(`Ticket Number: ${ticket.ticketNumber}`, 20, 45);
      doc.text(`Date Created: ${format(new Date(ticket.dateCreated), "MMM d, yyyy")}`, 20, 52);
      
      if (ticket.dateApproved) {
        doc.text(`Date Approved: ${format(new Date(ticket.dateApproved), "MMM d, yyyy")}`, 20, 59);
      }
      
      doc.text(`Status: ${ticket.status.toUpperCase()}`, 20, 66);
      
      // Supplier and Project details
      doc.setFontSize(14);
      doc.text("Supplier Details:", 20, 80);
      doc.setFontSize(12);
      doc.text(`Name: ${supplier?.companyName || 'N/A'}`, 25, 87);
      
      doc.setFontSize(14);
      doc.text("Project Details:", 20, 100);
      doc.setFontSize(12);
      doc.text(`Name: ${project?.projectName || 'N/A'}`, 25, 107);
      
      // Items table
      if (items && items.length > 0) {
        doc.setFontSize(14);
        doc.text("Service Items:", 20, 125);
        
        // Table headers
        doc.setFontSize(12);
        doc.text("Description", 20, 135);
        doc.text("Quantity", 120, 135);
        doc.text("Price", 150, 135);
        doc.text("Total", 180, 135);
        
        // Draw line under headers
        doc.line(20, 137, 190, 137);
        
        // Table content
        let yPos = 145;
        let totalAmount = 0;
        
        items.forEach((item: any, index: number) => {
          const price = typeof item.price === 'number' ? item.price : 0;
          const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
          const total = price * quantity;
          totalAmount += total;
          
          // Wrap description text if it's too long
          const description = item.description || 'No description';
          
          doc.text(description.substring(0, 40) + (description.length > 40 ? '...' : ''), 20, yPos);
          doc.text(quantity.toString(), 120, yPos);
          doc.text(`€${price.toFixed(2)}`, 150, yPos);
          doc.text(`€${total.toFixed(2)}`, 180, yPos);
          
          yPos += 10;
          
          // Add new page if needed
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
        });
        
        // Draw line under items
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        // Total amount
        doc.setFontSize(14);
        doc.text(`Total Amount: €${totalAmount.toFixed(2)}`, 120, yPos);
      }
      
      // Footer
      const footerText = `This document was generated on ${format(new Date(), "MMM d, yyyy")}`;
      doc.setFontSize(10);
      doc.text(footerText, 105, 280, { align: 'center' });
      
      // Save the PDF
      doc.save(`${ticket.ticketNumber}.pdf`);
      
      toast({
        title: "PDF Generated",
        description: "Service ticket has been downloaded as a PDF",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
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
          {row.totalValue 
            ? `€${Number(row.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
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
                onClick={() => handleOpenApprovalDialog(row.id, "approve")}
              >
                <CheckSquare className="h-4 w-4 text-green-600" />
                <span className="sr-only">Approve</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleOpenApprovalDialog(row.id, "reject")}
              >
                <XSquare className="h-4 w-4 text-red-600" />
                <span className="sr-only">Reject</span>
              </Button>
            </>
          )}
          
          {row.status === "approved" && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => generatePDF(row)}
            >
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
                  <SelectItem value="all">All Suppliers</SelectItem>
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
                <SelectItem value="all">All Statuses</SelectItem>
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
      
      {/* Approval/Rejection Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {ticketToAction?.action === "approve" ? "Approve Service Ticket" : "Reject Service Ticket"}
            </DialogTitle>
            <DialogDescription>
              {ticketToAction?.action === "approve" 
                ? "Add approval notes for this service ticket." 
                : "Please provide a reason for rejecting this service ticket."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Textarea
              placeholder="Enter notes here..."
              className="min-h-[100px]"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setApprovalDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#0063B1] hover:bg-[#004c8a]"
              onClick={ticketToAction?.action === "approve" ? handleApproveTicket : handleRejectTicket}
            >
              {ticketToAction?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
