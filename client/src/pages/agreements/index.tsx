import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileSpreadsheet, Eye, Edit, Trash, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { DataTable, Column } from "@/components/tables/data-table";
import { Agreement, Supplier } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

export default function AgreementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const isPurchasing = user?.role === "purchasing";
  const isSupplier = user?.role === "supplier";

  const { data: agreements = [], isLoading } = useQuery<Agreement[]>({
    queryKey: ['/api/agreements'],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await apiRequest("DELETE", `/api/agreements/${deleteId}`);
      toast({
        title: "Agreement deleted",
        description: "The agreement has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agreements'] });
      setDeleteId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete agreement",
        variant: "destructive",
      });
    }
  };

  const filteredAgreements = agreements.filter(
    (agreement) => {
      const matchesSearch = 
        agreement.agreementNumber.toLowerCase().includes(search.toLowerCase()) ||
        agreement.agreementDescription?.toLowerCase().includes(search.toLowerCase()) ||
        agreement.serviceArea?.toLowerCase().includes(search.toLowerCase());
      
      const matchesSupplier = !supplierFilter || agreement.supplierId === parseInt(supplierFilter);
      
      return matchesSearch && matchesSupplier;
    }
  );

  // If user is a supplier, only show their agreements
  const userAgreements = isSupplier && user?.companyId 
    ? filteredAgreements.filter(a => a.supplierId === user.companyId)
    : filteredAgreements;

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.companyName : 'Unknown Supplier';
  };

  const agreementColumns: Column<Agreement>[] = [
    {
      header: "Agreement No.",
      accessorKey: "agreementNumber",
      cell: (row) => (
        <div className="flex items-center">
          <FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.agreementNumber}</span>
        </div>
      ),
    },
    {
      header: "Supplier",
      accessorKey: "supplierId",
      cell: (row) => getSupplierName(row.supplierId),
    },
    {
      header: "Description",
      accessorKey: "agreementDescription",
    },
    {
      header: "Service Area",
      accessorKey: "serviceArea",
    },
    {
      header: "Valid Period",
      accessorKey: row => ({start: row.startDate, end: row.endDate}),
      cell: (row) => {
        const start = row.startDate ? format(new Date(row.startDate), 'dd MMM yyyy') : 'N/A';
        const end = row.endDate ? format(new Date(row.endDate), 'dd MMM yyyy') : 'N/A';
        
        // Check if agreement is expired
        const isExpired = row.endDate && new Date(row.endDate) < new Date();
        
        return (
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{start} - {end}</span>
            {isExpired && <Badge variant="destructive" className="ml-2">Expired</Badge>}
          </div>
        );
      },
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (row) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/agreements/${row.id}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Link>
          </Button>
          {isPurchasing && (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/agreements/${row.id}`}>
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setDeleteId(row.id)}
              >
                <Trash className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Agreements">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Agreements</h1>
          <p className="text-muted-foreground">Manage your supplier agreements and price lists</p>
        </div>

        {isPurchasing && (
          <Button asChild>
            <Link href="/agreements/new">
              <Plus className="mr-2 h-4 w-4" /> Add Agreement
            </Link>
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search agreements..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {!isSupplier && (
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
          )}
        </div>
      </div>

      <DataTable
        columns={agreementColumns}
        data={userAgreements}
        loading={isLoading}
        noResults={
          <div className="text-center py-4">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-2 text-lg font-semibold">No agreements found</h3>
            <p className="text-muted-foreground">
              {search || supplierFilter 
                ? "Try adjusting your filters" 
                : isPurchasing 
                  ? "Start by adding a new agreement" 
                  : "No agreements are currently available"
              }
            </p>
          </div>
        }
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this agreement? This action cannot be undone and will also delete all associated price list items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
