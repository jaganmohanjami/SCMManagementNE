import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, Edit, Trash } from "lucide-react";
import { Link } from "wouter";
import { DataTable, Column } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Supplier } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function SuppliersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const isPurchasing = user?.role === "purchasing";

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await apiRequest("DELETE", `/api/suppliers/${deleteId}`);
      toast({
        title: "Supplier deleted",
        description: "The supplier has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setDeleteId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive",
      });
    }
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (supplier.sapSupplierNumber && supplier.sapSupplierNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const supplierColumns: Column<Supplier>[] = [
    {
      header: "Company Name",
      accessorKey: "companyName",
      cell: (row) => (
        <div className="flex items-center">
          <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.companyName}</span>
        </div>
      ),
    },
    {
      header: "SAP Number",
      accessorKey: "sapSupplierNumber",
    },
    {
      header: "Primary Contact",
      accessorKey: "contactName1",
    },
    {
      header: "Email",
      accessorKey: "email1",
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (row) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/suppliers/${row.id}`}>
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          {isPurchasing && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setDeleteId(row.id)}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Suppliers">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier database</p>
        </div>

        {isPurchasing && (
          <Button asChild>
            <Link href="/suppliers/new">
              <Plus className="mr-2 h-4 w-4" /> Add Supplier
            </Link>
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search suppliers..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={supplierColumns}
        data={filteredSuppliers}
        loading={isLoading}
        noResults={
          <div className="text-center py-4">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-2 text-lg font-semibold">No suppliers found</h3>
            <p className="text-muted-foreground">
              {search ? "Try a different search term" : "Start by adding a new supplier"}
            </p>
          </div>
        }
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this supplier? This action cannot be undone.
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
