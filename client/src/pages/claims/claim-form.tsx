import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertClaimSchema, 
  Claim, 
  Supplier, 
  Project,
  Agreement,
  FileUpload
} from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, AlertTriangle, Upload, Paperclip, Calendar, FileText, Euro, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const claimFormSchema = insertClaimSchema.extend({
  id: z.number().optional(),
  dateEntered: z.string().optional(),
  claimNumber: z.string().optional(),
  dateHappened: z.string().optional(),
  dateApproved: z.string().optional(),
  dateSentToSupplier: z.string().optional(),
  dateFeedback: z.string().optional(),
  files: z.any().optional(),
});

type ClaimFormValues = z.infer<typeof claimFormSchema>;

export default function ClaimForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibleToSupplier, setVisibleToSupplier] = useState(true);
  
  const isEditing = !!id;
  const isLegal = user?.role === "legal";
  const isPurchasing = user?.role === "purchasing";
  const isSupplier = user?.role === "supplier";
  
  // Form setup first, before any references to it
  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      supplierId: isSupplier && user?.companyId ? user.companyId : undefined,
      projectId: undefined,
      agreementId: undefined,
      claimArea: undefined,
      dateHappened: format(new Date(), "yyyy-MM-dd"),
      damageAmount: undefined,
      claimInfo: "",
      defectsDescription: "",
      demandType: undefined,
      demandText: "",
      acceptedBySupplier: undefined,
      acceptedSupplierText: "",
      createdBy: user?.id,
    },
  });

  // Fetch claim data if editing
  const { data: claim, isLoading: isLoadingClaim } = useQuery<Claim & { files?: FileUpload[] }>({
    queryKey: ['/api/claims', parseInt(id || '0')],
    enabled: isEditing,
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  // Fetch agreements for selected supplier
  const { data: agreements = [] } = useQuery<Agreement[]>({
    queryKey: ['/api/agreements', { supplierId: form.watch("supplierId") }],
    enabled: !!form.watch("supplierId"),
  });
  
  // Define canEdit after claim data is available
  const canEdit = isLegal || isPurchasing || (isSupplier && claim?.supplierId === user?.companyId);

  useEffect(() => {
    if (claim) {
      form.reset({
        ...claim,
        dateHappened: claim.dateHappened ? format(new Date(claim.dateHappened), "yyyy-MM-dd") : undefined,
        dateApproved: claim.dateApproved ? format(new Date(claim.dateApproved), "yyyy-MM-dd") : undefined,
        dateSentToSupplier: claim.dateSentToSupplier ? format(new Date(claim.dateSentToSupplier), "yyyy-MM-dd") : undefined,
        dateFeedback: claim.dateFeedback ? format(new Date(claim.dateFeedback), "yyyy-MM-dd") : undefined,
      });
    }
  }, [claim, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ClaimFormValues) => {
      const res = await apiRequest("POST", "/api/claims", data);
      return await res.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Claim created",
        description: "The claim has been successfully created",
      });
      
      // Upload file if selected
      if (selectedFile) {
        await uploadFile(data.id);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      navigate(`/claims/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create claim",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ClaimFormValues) => {
      const res = await apiRequest("PUT", `/api/claims/${id}`, data);
      return await res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Claim updated",
        description: "The claim has been successfully updated",
      });
      
      // Upload file if selected
      if (selectedFile) {
        await uploadFile(parseInt(id || '0'));
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      queryClient.invalidateQueries({ queryKey: ['/api/claims', parseInt(id || '0')] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update claim",
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ fileData, entityId }: { fileData: FormData, entityId: number }) => {
      const res = await fetch(`/api/uploads`, {
        method: 'POST',
        body: fileData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('File upload failed');
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "File uploaded",
        description: "The file has been successfully uploaded",
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/claims', parseInt(id || '0')] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ClaimFormValues) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const uploadFile = async (entityId: number) => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('entityType', 'claim');
    formData.append('entityId', entityId.toString());
    formData.append('isVisibleToSupplier', visibleToSupplier.toString());
    
    uploadFileMutation.mutate({ fileData: formData, entityId });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.companyName : 'Unknown Supplier';
  };

  const getProjectName = (projectId?: number) => {
    if (!projectId) return 'N/A';
    const project = projects.find(p => p.id === projectId);
    return project ? project.projectName : 'Unknown Project';
  };

  const isLoading = isLoadingClaim || createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title={isEditing ? "Claim Details" : "New Claim"}>
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/claims")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Claims
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEditing ? claim?.claimNumber || "Claim Details" : "New Claim"}
        </h1>
        
        {isEditing && claim?.acceptedBySupplier !== undefined && (
          <div className="ml-4">
            <Badge variant={claim.acceptedBySupplier ? "outline" : "destructive"}>
              {claim.acceptedBySupplier ? "Accepted" : "Rejected"}
            </Badge>
          </div>
        )}
      </div>

      {isEditing && isLoadingClaim ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Claim Information
                </CardTitle>
                <CardDescription>
                  Enter the claim details below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier*</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
                              defaultValue={field.value?.toString()}
                              disabled={isSupplier || (!isLegal && !isPurchasing) || (isEditing && !canEdit)}
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
                        name="projectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
                              defaultValue={field.value?.toString()}
                              disabled={(!isLegal && !isPurchasing) || (isEditing && !canEdit)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {projects.map((project) => (
                                  <SelectItem 
                                    key={project.id} 
                                    value={project.id.toString()}
                                  >
                                    {project.projectName}
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
                        name="dateHappened"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date Claim Happened*</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input type="date" className="pl-10" {...field} disabled={(!isLegal && !isPurchasing) || (isEditing && !canEdit)} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="claimArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Claim Area*</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value || undefined}
                              disabled={(!isLegal && !isPurchasing) || (isEditing && !canEdit)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select claim area" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Material">Material</SelectItem>
                                <SelectItem value="Service">Service</SelectItem>
                                <SelectItem value="HSE">HSE</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="damageAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Damage Amount (€)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Euro className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  min="0" 
                                  className="pl-10" 
                                  placeholder="0.00" 
                                  {...field} 
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                                  disabled={(!isLegal && !isPurchasing) || (isEditing && !canEdit)}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="agreementId"
                        render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agreement</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            defaultValue={field.value?.toString()}
                            disabled={(!isLegal && !isPurchasing) || (isEditing && !canEdit)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select agreement" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {/* Will be populated when agreements endpoint is implemented */}
                              <SelectItem value="1">AGR-2025-001</SelectItem>
                              <SelectItem value="2">AGR-2025-002</SelectItem>
                              <SelectItem value="3">AGR-2025-003</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="claimInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Claim Details*</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter claim details" 
                              className="min-h-[100px]" 
                              {...field} 
                              value={field.value || ""}
                              disabled={(!isLegal && !isPurchasing) || (isEditing && !canEdit)}
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="defectsDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Defects Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter defects description" 
                              className="min-h-[80px]" 
                              {...field} 
                              value={field.value || ""}
                              disabled={(!isLegal && !isPurchasing) || (isEditing && !canEdit)}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="demandType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Demand Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value || undefined}
                              className="flex flex-col space-y-1"
                              disabled={(!isLegal && !isPurchasing) || (isEditing && !canEdit)}
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="replacement" />
                                </FormControl>
                                <FormLabel className="font-normal">Replacement</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="correction" />
                                </FormControl>
                                <FormLabel className="font-normal">Correction</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="compensation" />
                                </FormControl>
                                <FormLabel className="font-normal">Compensation</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="demandText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Demand Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter demand details" 
                              className="min-h-[80px]" 
                              {...field} 
                              value={field.value || ""}
                              disabled={(!isLegal && !isPurchasing) || (isEditing && !canEdit)}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {isEditing && isSupplier && (
                      <>
                        <FormField
                          control={form.control}
                          name="acceptedBySupplier"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Response to Claim</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={(value) => field.onChange(value === 'true')}
                                  defaultValue={field.value !== undefined ? field.value.toString() : undefined}
                                  className="flex flex-col space-y-1"
                                >
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="true" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Accept Claim</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="false" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Reject Claim</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="acceptedSupplierText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Response Comments</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter your response to this claim" 
                                  className="min-h-[100px]" 
                                  {...field} 
                                  value={field.value || ""}
                                  rows={4}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {(canEdit || isLegal || isPurchasing) && (
                      <div className="pt-4 flex flex-col md:flex-row gap-4 items-center">
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className="w-full md:w-auto"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              {isEditing ? "Update Claim" : "Create Claim"}
                            </>
                          )}
                        </Button>
                        
                        {isEditing && (
                          <div className="flex-1 w-full">
                            <div className="flex flex-col md:flex-row items-center gap-4">
                              <div className="flex-1 w-full">
                                <Input 
                                  type="file" 
                                  onChange={handleFileChange} 
                                  className="w-full"
                                />
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="visible-to-supplier" 
                                  checked={visibleToSupplier}
                                  onCheckedChange={(checked) => setVisibleToSupplier(checked as boolean)}
                                />
                                <label
                                  htmlFor="visible-to-supplier"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Visible to supplier
                                </label>
                              </div>
                              
                              <Button 
                                type="button" 
                                variant="outline" 
                                disabled={!selectedFile}
                                onClick={() => uploadFile(parseInt(id || '0'))}
                                className="w-full md:w-auto"
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload File
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          <div>
            {isEditing ? (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Claim Status</CardTitle>
                    <CardDescription>Current status information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm text-muted-foreground">Claim Number:</div>
                      <div className="text-sm font-medium">{claim?.claimNumber || 'N/A'}</div>
                      
                      <div className="text-sm text-muted-foreground">Status:</div>
                      <div className="text-sm font-medium">{claim?.statusText || 'New'}</div>
                      
                      <div className="text-sm text-muted-foreground">Supplier:</div>
                      <div className="text-sm font-medium">{claim?.supplierId ? getSupplierName(claim.supplierId) : 'N/A'}</div>
                      
                      <div className="text-sm text-muted-foreground">Project:</div>
                      <div className="text-sm font-medium">{getProjectName(claim?.projectId)}</div>
                      
                      <div className="text-sm text-muted-foreground">Date Entered:</div>
                      <div className="text-sm font-medium">
                        {claim?.dateEntered ? format(new Date(claim.dateEntered), "MMM d, yyyy") : 'N/A'}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Date Approved:</div>
                      <div className="text-sm font-medium">
                        {claim?.dateApproved ? format(new Date(claim.dateApproved), "MMM d, yyyy") : 'Pending'}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Date Sent to Supplier:</div>
                      <div className="text-sm font-medium">
                        {claim?.dateSentToSupplier ? format(new Date(claim.dateSentToSupplier), "MMM d, yyyy") : 'Pending'}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Supplier Feedback:</div>
                      <div className="text-sm font-medium">
                        {claim?.dateFeedback ? format(new Date(claim.dateFeedback), "MMM d, yyyy") : 'Pending'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {claim?.files && claim.files.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="mr-2 h-5 w-5" />
                        Attached Files
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>File Name</TableHead>
                            <TableHead>Visible to Supplier</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {claim.files.map((file: FileUpload) => (
                            <TableRow key={file.id}>
                              <TableCell>
                                <a 
                                  href={`/uploads/${file.filename}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center"
                                >
                                  <Paperclip className="mr-1 h-4 w-4" />
                                  {file.originalFilename}
                                </a>
                              </TableCell>
                              <TableCell>
                                {file.isVisibleToSupplier ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                    Visible
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                                    Internal Only
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Claim Process</CardTitle>
                  <CardDescription>Information about the claim process</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm">
                    <p className="mb-4">Creating a new claim involves the following steps:</p>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Legal or Operations creates the claim with initial details</li>
                      <li>The claim is reviewed and approved internally</li>
                      <li>Once approved, the claim is sent to the supplier</li>
                      <li>The supplier can then review and respond to the claim</li>
                      <li>Neptune Energy reviews the supplier's response and finalizes the claim</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}