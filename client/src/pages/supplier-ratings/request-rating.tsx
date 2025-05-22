import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Project, Supplier } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Send } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

// Define the schema for the rating request form
const ratingRequestSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  requestDescription: z.string().min(1, "Description is required").max(1000),
});

type RatingRequestFormValues = z.infer<typeof ratingRequestSchema>;

export default function RequestRatingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Only supplier users should be able to request ratings
  const isSupplier = user?.role === "supplier";
  const supplierId = user?.companyId;
  
  // Form setup
  const form = useForm<RatingRequestFormValues>({
    resolver: zodResolver(ratingRequestSchema),
    defaultValues: {
      projectId: "",
      requestDescription: "",
    },
  });
  
  // Fetch projects to populate the dropdown
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  // Fetch current supplier details if the user is a supplier
  const { data: supplier } = useQuery<Supplier>({
    queryKey: ['/api/suppliers', supplierId],
    enabled: !!supplierId,
  });
  
  // Mutation to submit the rating request
  const submitMutation = useMutation({
    mutationFn: async (data: RatingRequestFormValues) => {
      // Store the supplier ID for the request
      const payload = {
        ...data,
        supplierId,
        status: "pending", // Rating request is pending response
        projectId: parseInt(data.projectId),
        requestDate: new Date().toISOString()
      };
      
      const res = await apiRequest("POST", "/api/ratings/requests", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rating request submitted",
        description: "Your request for rating has been sent to Neptune engineers.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      navigate("/ratings");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating request",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: RatingRequestFormValues) => {
    if (!isSupplier || !supplierId) {
      toast({
        title: "Error",
        description: "Only supplier users can request ratings",
        variant: "destructive",
      });
      return;
    }
    
    submitMutation.mutate(values);
  };
  
  return (
    <AppLayout title="Request Rating">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/ratings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ratings
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Request Performance Rating</h1>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-[#0063B1]">Performance Rating Request</CardTitle>
        </CardHeader>
        <CardContent>
          {isSupplier && supplier ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="border p-4 rounded-md bg-slate-50">
                    <p className="text-sm font-medium">Supplier Information</p>
                    <p className="text-sm mt-2">{supplier.companyName}</p>
                    <p className="text-sm text-muted-foreground">{supplier.address}</p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
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
                    name="requestDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please provide details about the completed work that requires rating..."
                            rows={6}
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="text-sm bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <p className="font-medium text-yellow-800">Note:</p>
                  <p className="mt-1 text-yellow-700">
                    Neptune engineers will review your request and provide a rating within 5 days.
                    You will be notified by email once the rating is complete.
                  </p>
                </div>
              </form>
            </Form>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                You must be logged in as a supplier to request a performance rating.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button 
            variant="outline" 
            type="button"
            className="mr-2"
            onClick={() => navigate("/ratings")}
          >
            Cancel
          </Button>
          
          <Button 
            type="submit"
            className="bg-[#0063B1] hover:bg-[#004c8a]"
            onClick={form.handleSubmit(onSubmit)}
            disabled={submitMutation.isPending || !isSupplier}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </CardFooter>
      </Card>
    </AppLayout>
  );
}