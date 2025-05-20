import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierRatingSchema, SupplierRating, Supplier, Project } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Custom rating component
const RatingStars = ({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: number; 
  onChange: (value: number) => void; 
  disabled?: boolean 
}) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          disabled={disabled}
          className={`focus:outline-none ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        >
          <Star
            className={`h-6 w-6 ${
              star <= value
                ? "fill-yellow-500 text-yellow-500"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ratingFormSchema = insertSupplierRatingSchema.extend({
  id: z.number().optional(),
  ratingDate: z.string().optional(),
  overallRating: z.number().optional(),
});

type RatingFormValues = z.infer<typeof ratingFormSchema>;

export default function RatingForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isEditing = !!id;
  const isOperations = user?.role === "operations";
  const canEdit = isOperations && !isEditing;

  // Fetch rating data if editing
  const { data: rating, isLoading: isLoadingRating } = useQuery<SupplierRating>({
    queryKey: ['/api/ratings', parseInt(id || '0')],
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

  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingFormSchema),
    defaultValues: {
      supplierId: undefined,
      projectId: undefined,
      hseRating: 0,
      communicationRating: 0,
      competencyRating: 0,
      onTimeRating: 0,
      serviceRating: 0,
      overallText: "",
      createdBy: user?.id,
    },
  });

  useEffect(() => {
    if (rating) {
      form.reset({
        ...rating,
        ratingDate: rating.ratingDate ? format(new Date(rating.ratingDate), "yyyy-MM-dd") : undefined,
      });
    }
  }, [rating, form]);

  const createMutation = useMutation({
    mutationFn: async (data: RatingFormValues) => {
      const res = await apiRequest("POST", "/api/ratings", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rating submitted",
        description: "The supplier rating has been successfully submitted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      navigate("/ratings");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit supplier rating",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: RatingFormValues) => {
    createMutation.mutate(values);
  };

  const getSupplierName = (supplierId?: number) => {
    if (!supplierId) return 'Not selected';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.companyName : 'Unknown Supplier';
  };

  const getProjectName = (projectId?: number) => {
    if (!projectId) return 'Not selected';
    const project = projects.find(p => p.id === projectId);
    return project ? project.projectName : 'Unknown Project';
  };

  const isLoading = isLoadingRating || createMutation.isPending;

  return (
    <AppLayout title={isEditing ? "Rating Details" : "New Supplier Rating"}>
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/ratings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ratings
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEditing ? "Rating Details" : "New Supplier Rating"}
        </h1>
      </div>

      {isEditing && isLoadingRating ? (
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
              <Star className="mr-2 h-5 w-5" />
              {isEditing ? "Rating Details" : "Supplier Rating Form"}
            </CardTitle>
            <CardDescription>
              {isEditing 
                ? "View the submitted supplier performance rating" 
                : "Rate the supplier's performance in various categories"}
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
                        {isEditing ? (
                          <div className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                            {getSupplierName(field.value)}
                          </div>
                        ) : (
                          <Select 
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
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project*</FormLabel>
                        {isEditing ? (
                          <div className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                            {getProjectName(field.value)}
                          </div>
                        ) : (
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
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border rounded-md p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
                  <h3 className="font-medium text-lg">Performance Ratings</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Rate the supplier's performance in each category from 1 (poor) to 5 (excellent)
                  </p>
                  
                  {/* HSE Rating */}
                  <FormField
                    control={form.control}
                    name="hseRating"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <FormLabel className="text-sm min-w-[150px] sm:mb-0">
                            Health, Safety & Environment
                          </FormLabel>
                          <RatingStars
                            value={field.value || 0}
                            onChange={field.onChange}
                            disabled={isEditing}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Communication Rating */}
                  <FormField
                    control={form.control}
                    name="communicationRating"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <FormLabel className="text-sm min-w-[150px] sm:mb-0">
                            Communication
                          </FormLabel>
                          <RatingStars
                            value={field.value || 0}
                            onChange={field.onChange}
                            disabled={isEditing}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Competency Rating */}
                  <FormField
                    control={form.control}
                    name="competencyRating"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <FormLabel className="text-sm min-w-[150px] sm:mb-0">
                            Technical Competency
                          </FormLabel>
                          <RatingStars
                            value={field.value || 0}
                            onChange={field.onChange}
                            disabled={isEditing}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* On-Time Rating */}
                  <FormField
                    control={form.control}
                    name="onTimeRating"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <FormLabel className="text-sm min-w-[150px] sm:mb-0">
                            On-Time Delivery
                          </FormLabel>
                          <RatingStars
                            value={field.value || 0}
                            onChange={field.onChange}
                            disabled={isEditing}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Service Rating */}
                  <FormField
                    control={form.control}
                    name="serviceRating"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <FormLabel className="text-sm min-w-[150px] sm:mb-0">
                            Service Quality
                          </FormLabel>
                          <RatingStars
                            value={field.value || 0}
                            onChange={field.onChange}
                            disabled={isEditing}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Overall Rating</h3>
                      <div className="flex items-center">
                        <Badge className="text-lg px-3 py-1 bg-primary text-primary-foreground">
                          {Number(rating?.overallRating).toFixed(1)}
                        </Badge>
                        <span className="text-sm text-muted-foreground ml-2">
                          out of 5.0
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-1">Rating Date</h3>
                      <div className="text-sm">
                        {rating?.ratingDate ? format(new Date(rating.ratingDate), "MMMM d, yyyy") : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="overallText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Comments</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter any additional comments or feedback about the supplier's performance" 
                          className="resize-none" 
                          rows={4}
                          {...field}
                          disabled={isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {canEdit && (
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/ratings")}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? "Submitting..." : "Submit Rating"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
