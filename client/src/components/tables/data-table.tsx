import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReactNode } from "react";

export interface Column<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => any);
  cell?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    onPageChange: (page: number) => void;
  };
  noResults?: ReactNode;
}

export function DataTable<T>({ 
  columns, 
  data, 
  loading = false,
  pagination,
  noResults = "No results found"
}: DataTableProps<T>) {
  
  const getValue = <T,>(row: T, accessorKey: keyof T | ((row: T) => any)) => {
    if (typeof accessorKey === 'function') {
      return accessorKey(row);
    }
    return row[accessorKey];
  };
  
  return (
    <div className="rounded-md border">
      <div className="relative min-h-[200px]">
        <div className={`${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead key={index}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={columns.length} 
                    className="h-32 text-center"
                  >
                    {noResults}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column, columnIndex) => (
                      <TableCell key={columnIndex}>
                        {column.cell ? 
                          column.cell(row) : 
                          getValue(row, column.accessorKey)
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )}
      </div>
      
      {pagination && (
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <p className="text-sm text-muted-foreground">
            Page {pagination.pageIndex + 1} of {pagination.pageCount}
          </p>
          
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
              disabled={pagination.pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Page</span>
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
              disabled={pagination.pageIndex === pagination.pageCount - 1}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
