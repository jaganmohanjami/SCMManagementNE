import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, Supplier } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const supplierFormSchema = insertSupplierSchema.extend({
  id: z.number().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export default function SupplierForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;

  // Fetch supplier data if editing
  const { data: supplier, isLoading: isLoadingSupplier } = useQuery<Supplier>({
    queryKey: ['/api/suppliers', parseInt(id || '0')],
    enabled: isEditing,
  });

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      companyName: "",
      address: "",
      sapSupplierNumber: "",
      contactName1: "",
      email1: "",
      contactName2: "",
      email2: "",
    },
  });

  useEffect(() => {
    if (supplier) {
      form.reset(supplier);
    }
  }, [supplier, form]);

  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormValues) => {
      const res = await apiRequest("POST", "/api/suppliers", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier created",
        description: "The supplier has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      navigate("/suppliers");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SupplierFormValues) => {
      const res = await apiRequest("PUT", `/api/suppliers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier updated",
        description: "The supplier has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', parseInt(id || '0')] });
      navigate("/suppliers");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: SupplierFormValues) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isLoading = isLoadingSupplier || createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title={isEditing ? "Edit Supplier" : "New Supplier"}>
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/suppliers")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEditing ? "Edit Supplier" : "New Supplier"}
        </h1>
      </div>

      {isEditing && isLoadingSupplier ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Supplier Information
            </CardTitle>
            <CardDescription>
              Enter the supplier's details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sapSupplierNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SAP Supplier Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter SAP number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactName1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter primary contact name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter primary contact email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactName2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter secondary contact name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter secondary contact email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter company address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/suppliers")}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? "Saving..." : "Save Supplier"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
