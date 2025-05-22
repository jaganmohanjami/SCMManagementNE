import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Project } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Send, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

// Form schema for rating request
const ratingRequestSchema = z.object({
  projectId: z.number({
    required_error: "Please select a project",
  }),
  jobDescription: z.string().min(10, {
    message: "Job description should be at least 10 characters.",
  }),
  message: z.string().min(10, {
    message: "Message should be at least 10 characters.",
  }),
});

type RatingRequestValues = z.infer<typeof ratingRequestSchema>;

export default function RequestRatingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Only suppliers can request ratings
  const isSupplier = user?.role === "supplier";
  
  // Fetch projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const form = useForm<RatingRequestValues>({
    resolver: zodResolver(ratingRequestSchema),
    defaultValues: {
      projectId: undefined,
      message: "",
    },
  });

  const requestRatingMutation = useMutation({
    mutationFn: async (data: RatingRequestValues) => {
      const payload = {
        ...data,
        supplierId: user?.companyId,
        requestDate: format(new Date(), "yyyy-MM-dd"),
        status: "pending",
        createdBy: user?.id,
      };
      const res = await apiRequest("POST", "/api/ratings/requests", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your rating request has been submitted to the Operations team",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings/requests'] });
      navigate("/ratings");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit rating request",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (values: RatingRequestValues) => {
    setIsSubmitting(true);
    requestRatingMutation.mutate(values);
  };

  if (!isSupplier) {
    return (
      <AppLayout title="Request Rating">
        <div className="mb-6 flex items-center">
          <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/ratings")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ratings
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            Request Performance Rating
          </h1>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only supplier accounts can request performance ratings.
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Request Rating">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/ratings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ratings
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">
          Request Performance Rating
        </h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">Job Rating Request</CardTitle>
          <CardDescription>
            Request a performance evaluation for a completed job or service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project*</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                      disabled={isLoadingProjects}
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
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description*</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the specific job or service you performed for this project" 
                        className="resize-none" 
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Job Context*</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide any additional context or special circumstances about the job" 
                        className="resize-none" 
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include any challenges encountered, special requirements, or other factors that influenced your work
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/ratings")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit Request
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}