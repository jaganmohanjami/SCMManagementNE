import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, AlertTriangle, Eye, Edit } from "lucide-react";
import { Link } from "wouter";
import { DataTable, Column } from "@/components/tables/data-table";
import { Claim, Supplier, Project } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

export default function ClaimsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  
  const isLegal = user?.role === "legal";
  const isSupplier = user?.role === "supplier";
  const isOperations = user?.role === "operations";
  const isPurchasing = user?.role === "purchasing";

  const { data: claims = [], isLoading } = useQuery<Claim[]>({
    queryKey: ['/api/claims'],
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

  const getProjectName = (projectId?: number) => {
    if (!projectId) return 'N/A';
    const project = projects.find(p => p.id === projectId);
    return project ? project.projectName : 'Unknown Project';
  };

  const filteredClaims = claims.filter(
    (claim) => {
      const matchesSearch = 
        claim.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
        (claim.claimInfo && claim.claimInfo.toLowerCase().includes(search.toLowerCase()));
      
      const matchesSupplier = !supplierFilter || claim.supplierId === parseInt(supplierFilter);
      const matchesArea = !areaFilter || claim.claimArea === areaFilter;
      
      // If user is a supplier, only show their claims
      if (isSupplier && user?.companyId) {
        return matchesSearch && matchesArea && claim.supplierId === user.companyId;
      }
      
      return matchesSearch && matchesSupplier && matchesArea;
    }
  );

  const getClaimAreaBadge = (area?: string) => {
    if (!area) return null;
    
    switch (area) {
      case "Material":
        return <Badge variant="destructive">{area}</Badge>;
      case "Service":
        return <Badge variant="default">{area}</Badge>;
      case "HSE":
        return <Badge className="badge-neptune-warning">{area}</Badge>;
      default:
        return <Badge>{area}</Badge>;
    }
  };

  const getAcceptedStatusBadge = (accepted?: boolean) => {
    if (accepted === undefined) return <Badge variant="outline">Pending</Badge>;
    return accepted ? 
      <Badge className="badge-neptune-success">Accepted</Badge> : 
      <Badge variant="destructive">Rejected</Badge>;
  };

  const claimColumns: Column<Claim>[] = [
    {
      header: "Claim #",
      accessorKey: "claimNumber",
      cell: (row) => (
        <div className="flex items-center">
          <AlertTriangle className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-primary">{row.claimNumber}</span>
        </div>
      ),
    },
    {
      header: "Supplier",
      accessorKey: "supplierId",
      cell: (row) => getSupplierName(row.supplierId),
    },
    {
      header: "Project",
      accessorKey: "projectId",
      cell: (row) => getProjectName(row.projectId || undefined),
    },
    {
      header: "Claim Area",
      accessorKey: "claimArea",
      cell: (row) => getClaimAreaBadge(row.claimArea || undefined),
    },
    {
      header: "Date",
      accessorKey: "dateHappened",
      cell: (row) => row.dateHappened ? format(new Date(row.dateHappened), "MMM d, yyyy") : 'N/A',
    },
    {
      header: "Damage Amount",
      accessorKey: "damageAmount",
      cell: (row) => (
        <span className="font-medium">
          {typeof row.damageAmount === 'number' 
            ? `€${Number(row.damageAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
            : 'N/A'}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "acceptedBySupplier",
      cell: (row) => getAcceptedStatusBadge(row.acceptedBySupplier === null ? undefined : row.acceptedBySupplier),
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (row) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/claims/${row.id}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Link>
          </Button>
          
          {isLegal && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/claims/${row.id}`}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Claims">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Claims Management</h1>
          <p className="text-muted-foreground">Track and manage supplier claims</p>
        </div>

        {isPurchasing && (
          <Button asChild className="bg-[#0063B1] hover:bg-[#004c8a]">
            <Link href="/claims/new">
              <Plus className="mr-2 h-4 w-4" /> New Claim
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
              value={areaFilter}
              onValueChange={setAreaFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Claim Areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Claim Areas</SelectItem>
                <SelectItem value="Material">Material</SelectItem>
                <SelectItem value="Service">Service</SelectItem>
                <SelectItem value="HSE">HSE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search claims..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={claimColumns}
        data={filteredClaims}
        loading={isLoading}
        noResults={
          <div className="text-center py-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-2 text-lg font-semibold">No claims found</h3>
            <p className="text-muted-foreground">
              {search || supplierFilter || areaFilter 
                ? "Try adjusting your filters" 
                : isLegal 
                  ? "Start by creating a new claim" 
                  : "No claims are currently available"
              }
            </p>
          </div>
        }
        pagination={{
          pageIndex: 0,
          pageSize: 10,
          pageCount: Math.ceil(filteredClaims.length / 10),
          onPageChange: () => {},
        }}
      />
    </AppLayout>
  );
}
