import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { format as formatDate, parse } from "date-fns";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  insertClaimSchema, 
  Supplier, 
  Project, 
  Agreement,
  Claim 
} from "@shared/schema";
import { CalendarIcon, Save, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

// Extend the claim schema with additional validation
const claimFormSchema = insertClaimSchema.extend({
  supplierId: z.number().min(1, "Supplier is required"),
  projectId: z.number().min(1, "Project is required"),
  claimArea: z.string().min(1, "Claim area is required"),
  dateHappened: z.date({
    required_error: "Date is required",
  }),
  claimInfo: z.string().min(5, "Please provide at least 5 characters of information"),
  damageText: z.string().min(5, "Please describe the damage in at least 5 characters"),
  damageAmount: z.string().min(1, "Damage amount is required"),
  agreementId: z.number().optional(),
  orderNumber: z.string().optional(),
  defectsDescription: z.string().optional(),
  demandType: z.string().optional(),
  demandText: z.string().optional(),
});

type ClaimFormValues = z.infer<typeof claimFormSchema>;

export default function NewClaimPage() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: agreements = [] } = useQuery<Agreement[]>({
    queryKey: ['/api/agreements'],
  });

  const claimAreaOptions = [
    { value: "Material", label: "Material" },
    { value: "Service", label: "Service" },
    { value: "HSE", label: "HSE" },
  ];

  const demandTypeOptions = [
    { value: "Compensation", label: "Compensation" },
    { value: "Replacement", label: "Replacement" },
    { value: "Repair", label: "Repair" },
    { value: "Credit Note", label: "Credit Note" },
    { value: "Other", label: "Other" }
  ];

  // Pre-populate supplierId if user is a supplier
  const defaultValues: Partial<ClaimFormValues> = {
    supplierId: user?.role === 'supplier' && user.companyId ? user.companyId : undefined,
    dateHappened: new Date(),
    claimArea: "",
    statusText: "New"
  };

  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(claimFormSchema),
    defaultValues,
  });

  const createClaimMutation = useMutation({
    mutationFn: async (data: ClaimFormValues) => {
      // Format the data
      const formattedData = {
        ...data,
        dateHappened: format(data.dateHappened, "yyyy-MM-dd"),
        createdBy: user?.id,
      };

      // Send the data to the API
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create claim');
      }

      return response.json();
    },
    onSuccess: (newClaim: Claim) => {
      // Invalidate claims query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      
      // Show success message
      toast({
        title: "Claim submitted successfully",
        description: `Claim ${newClaim.claimNumber} has been created.`,
      });
      
      // Redirect to the claim details page
      setLocation(`/claims/${newClaim.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Watch for supplier changes to filter agreements
  const selectedSupplierId = form.watch("supplierId");
  const supplierId = selectedSupplierId || (user?.role === 'supplier' ? user.companyId : undefined);
  
  // Get supplier agreements
  const filteredAgreements = agreements.filter(
    agreement => agreement.supplierId === supplierId
  );

  // Filter projects based on agreements
  const filteredProjects = projects;
  
  async function onSubmit(data: ClaimFormValues) {
    createClaimMutation.mutate(data);
  }

  return (
    <AppLayout title="Submit New Claim">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Submit New Claim</h1>
        <p className="text-muted-foreground">Report an issue with a supplier product or service</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claim Details</CardTitle>
          <CardDescription>
            Please provide detailed information about the claim
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supplier Selection */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <Select
                        disabled={user?.role === 'supplier'}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
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

                {/* Project Selection */}
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredProjects.map((project) => (
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

                {/* Agreement Reference */}
                <FormField
                  control={form.control}
                  name="agreementId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agreement Reference (optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agreement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No agreement</SelectItem>
                          {filteredAgreements.map((agreement) => (
                            <SelectItem 
                              key={agreement.id} 
                              value={agreement.id.toString()}
                            >
                              {agreement.agreementNumber} - {agreement.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Order Number */}
                <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Number (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ORD-12345" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Claim Area */}
                <FormField
                  control={form.control}
                  name="claimArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Claim Area</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select claim type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {claimAreaOptions.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Happened */}
                <FormField
                  control={form.control}
                  name="dateHappened"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Incident</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={
                                "w-full pl-3 text-left font-normal"
                              }
                            >
                              {field.value ? (
                                format(field.value, "MMMM do, yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Damage Amount */}
                <FormField
                  control={form.control}
                  name="damageAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Damage Amount (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Claim Details */}
              <FormField
                control={form.control}
                name="claimInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Claim Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide detailed information about the claim"
                        className="h-24"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Damage Description */}
              <FormField
                control={form.control}
                name="damageText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Damage Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the impact and damage in detail"
                        className="h-24"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Defects Description */}
              <FormField
                control={form.control}
                name="defectsDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Defects Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any defects or issues in detail"
                        className="h-24"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Demand Type */}
                <FormField
                  control={form.control}
                  name="demandType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Demand Type (optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select demand type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No specific demand</SelectItem>
                          {demandTypeOptions.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Demand Text */}
                <FormField
                  control={form.control}
                  name="demandText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Demand Details (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Details of your demands"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/claims")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#0063B1] hover:bg-[#004c8a]"
                  disabled={createClaimMutation.isPending}
                >
                  {createClaimMutation.isPending ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Submit Claim
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}