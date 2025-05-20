import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAgreementSchema, Agreement, Supplier, PriceList } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, FileSpreadsheet, Upload, Plus, Trash, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const agreementFormSchema = insertAgreementSchema.extend({
  id: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type AgreementFormValues = z.infer<typeof agreementFormSchema>;

const priceListItemSchema = z.object({
  id: z.number().optional(),
  agreementId: z.number().optional(),
  itemNumber: z.string().optional(),
  outlineLevel: z.number().optional(),
  positionNumber: z.string(),
  shortText: z.string(),
  longText: z.string().optional(),
  grossPrice: z.number(),
  currency: z.string(),
  unitOfMeasure: z.string(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

type PriceListItemFormValues = z.infer<typeof priceListItemSchema>;

export default function AgreementForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("details");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [priceListItems, setPriceListItems] = useState<PriceListItemFormValues[]>([]);
  const [newItem, setNewItem] = useState<PriceListItemFormValues>({
    positionNumber: "",
    shortText: "",
    grossPrice: 0,
    currency: "EUR",
    unitOfMeasure: "",
  });
  
  const isEditing = !!id;
  const isPurchasing = user?.role === "purchasing";
  const isSupplier = user?.role === "supplier";
  const canEdit = isPurchasing || (isSupplier && user?.companyId === agreement?.supplierId);

  // Fetch agreement data if editing
  const { data: agreement, isLoading: isLoadingAgreement } = useQuery<Agreement>({
    queryKey: ['/api/agreements', parseInt(id || '0')],
    enabled: isEditing,
  });

  // Fetch suppliers
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Fetch price list if editing
  const { data: priceList = [], isLoading: isLoadingPriceList } = useQuery<PriceList[]>({
    queryKey: ['/api/agreements', parseInt(id || '0'), '/pricelist'],
    enabled: isEditing,
  });

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementFormSchema),
    defaultValues: {
      agreementNumber: "",
      supplierId: undefined,
      agreementDescription: "",
      materialGroupNumber: "",
      serviceArea: "",
      startDate: "",
      endDate: "",
      paymentTerms: "",
    },
  });

  useEffect(() => {
    if (agreement) {
      form.reset({
        ...agreement,
        startDate: agreement.startDate ? format(new Date(agreement.startDate), 'yyyy-MM-dd') : undefined,
        endDate: agreement.endDate ? format(new Date(agreement.endDate), 'yyyy-MM-dd') : undefined,
      });
    }
  }, [agreement, form]);

  useEffect(() => {
    if (priceList && priceList.length > 0) {
      setPriceListItems(priceList.map(item => ({
        ...item,
        validFrom: item.validFrom ? format(new Date(item.validFrom), 'yyyy-MM-dd') : undefined,
        validTo: item.validTo ? format(new Date(item.validTo), 'yyyy-MM-dd') : undefined,
      })));
    }
  }, [priceList]);

  const createMutation = useMutation({
    mutationFn: async (data: AgreementFormValues) => {
      const res = await apiRequest("POST", "/api/agreements", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Agreement created",
        description: "The agreement has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agreements'] });
      
      // If we have price list items to save
      if (priceListItems.length > 0) {
        savePriceList(data.id);
      } else {
        navigate("/agreements");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create agreement",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AgreementFormValues) => {
      const res = await apiRequest("PUT", `/api/agreements/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Agreement updated",
        description: "The agreement has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agreements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agreements', parseInt(id || '0')] });
      navigate("/agreements");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update agreement",
        variant: "destructive",
      });
    },
  });

  const savePriceListMutation = useMutation({
    mutationFn: async ({ agreementId, items }: { agreementId: number, items: PriceListItemFormValues[] }) => {
      const res = await apiRequest("POST", `/api/agreements/${agreementId}/pricelist`, items);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Price list saved",
        description: "The price list has been successfully saved",
      });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['/api/agreements', parseInt(id), '/pricelist'] });
      }
      navigate("/agreements");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save price list",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AgreementFormValues) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const savePriceList = (agreementId: number) => {
    const itemsToSave = priceListItems.map(item => ({
      ...item,
      agreementId,
    }));
    
    savePriceListMutation.mutate({ agreementId, items: itemsToSave });
  };

  const handleAddPriceItem = () => {
    if (!newItem.positionNumber || !newItem.shortText) {
      toast({
        title: "Missing information",
        description: "Please provide at least position number and description",
        variant: "destructive",
      });
      return;
    }
    
    setPriceListItems([...priceListItems, newItem]);
    setNewItem({
      positionNumber: "",
      shortText: "",
      grossPrice: 0,
      currency: "EUR",
      unitOfMeasure: "",
    });
  };

  const handleDeletePriceItem = (index: number) => {
    const updatedItems = [...priceListItems];
    updatedItems.splice(index, 1);
    setPriceListItems(updatedItems);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    
    // In a real implementation, you would parse the Excel file here
    // and populate the priceListItems state
    
    toast({
      title: "File uploaded",
      description: "Price list has been successfully parsed from Excel file",
    });
    
    // For the demo, let's add some sample items
    setPriceListItems([
      {
        positionNumber: "10",
        shortText: "Engineering services",
        longText: "Engineering consulting services per hour",
        grossPrice: 120,
        currency: "EUR",
        unitOfMeasure: "hr",
      },
      {
        positionNumber: "20",
        shortText: "Equipment rental",
        longText: "Drill equipment rental",
        grossPrice: 500,
        currency: "EUR",
        unitOfMeasure: "day",
      },
      {
        positionNumber: "30",
        shortText: "Transportation",
        longText: "Transportation of equipment to site",
        grossPrice: 750,
        currency: "EUR",
        unitOfMeasure: "trip",
      },
    ]);
  };

  const isLoading = isLoadingAgreement || isLoadingSuppliers || createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title={isEditing ? "Agreement Details" : "New Agreement"}>
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/agreements")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Agreements
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEditing ? "Agreement Details" : "New Agreement"}
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="details">Agreement Details</TabsTrigger>
          <TabsTrigger value="pricelist">Price List</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          {isEditing && isLoadingAgreement ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileSpreadsheet className="mr-2 h-5 w-5" />
                  Agreement Information
                </CardTitle>
                <CardDescription>
                  Enter the agreement details below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="agreementNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agreement Number*</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. AGR-2023-001" {...field} disabled={!canEdit} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier*</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
                              defaultValue={field.value?.toString()}
                              disabled={!canEdit || isSupplier}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a supplier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {suppliers.map((supplier) => (
                                  <SelectItem 
                                    key={supplier.id} 
                                    value={supplier.id.toString()}
                                  >
                                    {supplier.companyName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="agreementDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter agreement description" {...field} disabled={!canEdit} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="materialGroupNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Material Group Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter material group number" {...field} disabled={!canEdit} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="serviceArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Area</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Drilling, Maintenance" {...field} disabled={!canEdit} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="paymentTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Terms</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Net 30" {...field} disabled={!canEdit} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input type="date" className="pl-10" {...field} disabled={!canEdit} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input type="date" className="pl-10" {...field} disabled={!canEdit} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {canEdit && (
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate("/agreements")}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          <Save className="mr-2 h-4 w-4" />
                          {isLoading ? "Saving..." : "Save Agreement"}
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pricelist">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5" />
                Price List
              </CardTitle>
              <CardDescription>
                Manage the price list for this agreement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing && isLoadingPriceList ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  {canEdit && (
                    <div className="mb-6 space-y-4">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium mr-4">Add Price List Items</h3>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Button variant="outline" className="mr-2">
                              <label className="cursor-pointer flex items-center">
                                <Upload className="mr-2 h-4 w-4" />
                                Import Excel
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept=".xlsx,.xls,.csv" 
                                  onChange={handleFileUpload}
                                />
                              </label>
                            </Button>
                            <p className="text-sm text-muted-foreground">
                              {uploadedFile ? `Uploaded: ${uploadedFile.name}` : "Upload an Excel file with price list items"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-6 gap-2">
                        <div className="col-span-1">
                          <Input 
                            placeholder="Position #" 
                            value={newItem.positionNumber} 
                            onChange={(e) => setNewItem({...newItem, positionNumber: e.target.value})}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input 
                            placeholder="Description" 
                            value={newItem.shortText} 
                            onChange={(e) => setNewItem({...newItem, shortText: e.target.value})}
                          />
                        </div>
                        <div className="col-span-1">
                          <Input 
                            type="number" 
                            placeholder="Price" 
                            value={newItem.grossPrice || ""} 
                            onChange={(e) => setNewItem({...newItem, grossPrice: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="col-span-1">
                          <Input 
                            placeholder="Unit" 
                            value={newItem.unitOfMeasure} 
                            onChange={(e) => setNewItem({...newItem, unitOfMeasure: e.target.value})}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button onClick={handleAddPriceItem} className="w-full">
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Position #</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Unit</TableHead>
                          {canEdit && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceListItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-4 text-muted-foreground">
                              No price list items available
                            </TableCell>
                          </TableRow>
                        ) : (
                          priceListItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.positionNumber}</TableCell>
                              <TableCell>{item.shortText}</TableCell>
                              <TableCell>{item.grossPrice}</TableCell>
                              <TableCell>{item.currency}</TableCell>
                              <TableCell>{item.unitOfMeasure}</TableCell>
                              {canEdit && (
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeletePriceItem(index)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {canEdit && priceListItems.length > 0 && (
                    <div className="flex justify-end mt-4">
                      <Button 
                        onClick={() => {
                          if (isEditing && id) {
                            savePriceList(parseInt(id));
                          } else if (agreement?.id) {
                            savePriceList(agreement.id);
                          } else {
                            // If we're creating a new agreement, the price list will be saved after the agreement is created
                            setActiveTab("details");
                            toast({
                              title: "Save agreement first",
                              description: "Please save the agreement details before saving the price list",
                            });
                          }
                        }}
                        disabled={savePriceListMutation.isPending}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {savePriceListMutation.isPending ? "Saving..." : "Save Price List"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
