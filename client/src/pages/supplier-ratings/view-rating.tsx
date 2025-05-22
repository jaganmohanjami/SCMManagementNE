import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, ArrowLeft, Calendar, Clock, FileCheck, FileDown, ThumbsUp, AlertCircle } from "lucide-react";
import { SupplierRating, Supplier, Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

export default function ViewRatingPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [acceptComment, setAcceptComment] = useState("");

  const isSupplier = user?.role === "supplier";
  const isOperations = user?.role === "operations";
  const isPurchasing = user?.role === "purchasing";
  const isManagement = user?.role === "management";

  // Fetch the rating details
  const { data: rating, isLoading: isLoadingRating } = useQuery<SupplierRating>({
    queryKey: [`/api/ratings/${id}`],
  });

  // Fetch supplier information
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Fetch project information
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Accept rating mutation
  const acceptRatingMutation = useMutation({
    mutationFn: async (data: { comment: string }) => {
      const res = await apiRequest("PATCH", `/api/ratings/${id}/accept`, {
        acceptedBySupplier: true,
        acceptedDate: new Date().toISOString(),
        supplierComment: data.comment,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rating accepted",
        description: "You have successfully accepted this performance rating",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/ratings/${id}`] });
      setAcceptDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept rating",
        variant: "destructive",
      });
    },
  });

  // Download PDF function
  const downloadRatingPDF = async () => {
    try {
      const res = await fetch(`/api/ratings/${id}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rating-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF downloaded",
        description: "Your rating document has been downloaded",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Download failed",
        description: "Could not download the rating PDF",
        variant: "destructive",
      });
    }
  };

  // Star rendering function
  const renderStars = (rating: number) => {
    return (
      <div className="flex text-yellow-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${star <= rating ? "fill-current" : "stroke-current"}`}
          />
        ))}
      </div>
    );
  };

  // Get supplier name
  const getSupplierName = (supplierId?: number) => {
    if (!supplierId) return 'Unknown Supplier';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.companyName : 'Unknown Supplier';
  };

  // Get project name
  const getProjectName = (projectId?: number) => {
    if (!projectId) return 'Unknown Project';
    const project = projects.find(p => p.id === projectId);
    return project ? project.projectName : 'Unknown Project';
  };

  // Check if the rating can be accepted (within 5 days and by the supplier)
  const canAcceptRating = () => {
    if (!rating || !isSupplier) return false;
    
    const ratingDate = new Date(rating.ratingDate);
    const now = new Date();
    const daysSinceRating = differenceInDays(now, ratingDate);
    
    // Can accept if:
    // 1. User is a supplier
    // 2. Rating is for their company
    // 3. Rating is within 5 days old
    // 4. Rating has not been accepted yet
    return (
      isSupplier && 
      user?.companyId === rating.supplierId && 
      daysSinceRating <= 5 &&
      rating.acceptedBySupplier !== true
    );
  };

  // Validation for the accept dialog
  const isCommentValid = acceptComment.trim().length >= 10;

  if (isLoadingRating) {
    return (
      <AppLayout title="View Rating">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0063B1]"></div>
        </div>
      </AppLayout>
    );
  }

  if (!rating) {
    return (
      <AppLayout title="View Rating">
        <div className="mb-6 flex items-center">
          <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/ratings")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ratings
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Rating not found</AlertTitle>
          <AlertDescription>
            The requested rating could not be found or you don't have permission to view it.
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="View Rating">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/ratings")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ratings
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            Supplier Performance Rating
          </h1>
        </div>

        <div className="flex gap-3">
          {(isSupplier && rating.acceptedBySupplier) && (
            <Button onClick={downloadRatingPDF} className="bg-[#0063B1] hover:bg-[#004c8a]">
              <FileDown className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          )}
          
          {canAcceptRating() && (
            <Button onClick={() => setAcceptDialogOpen(true)} className="bg-[#0063B1] hover:bg-[#004c8a]">
              <ThumbsUp className="mr-2 h-4 w-4" /> Accept Rating
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Rating Details</CardTitle>
                  <CardDescription>
                    Performance evaluation for {getSupplierName(rating.supplierId)}
                  </CardDescription>
                </div>
                <Badge className={rating.acceptedBySupplier ? "badge-neptune-success" : "badge-neptune-warning"}>
                  {rating.acceptedBySupplier ? "Accepted" : "Pending Acceptance"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Supplier</h3>
                  <p className="text-foreground">{getSupplierName(rating.supplierId)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Project</h3>
                  <p className="text-foreground">{getProjectName(rating.projectId)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Rating Date</h3>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="text-foreground">{format(new Date(rating.ratingDate), "MMMM d, yyyy")}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Age</h3>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="text-foreground">{formatDistanceToNow(new Date(rating.ratingDate), { addSuffix: true })}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Performance Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  <div>
                    <p className="text-foreground mb-1">Health, Safety & Environment</p>
                    {renderStars(rating.hseRating || 0)}
                  </div>
                  <div>
                    <p className="text-foreground mb-1">Communication</p>
                    {renderStars(rating.communicationRating || 0)}
                  </div>
                  <div>
                    <p className="text-foreground mb-1">Technical Competency</p>
                    {renderStars(rating.competencyRating || 0)}
                  </div>
                  <div>
                    <p className="text-foreground mb-1">On-Time Delivery</p>
                    {renderStars(rating.onTimeRating || 0)}
                  </div>
                  <div>
                    <p className="text-foreground mb-1">Service Quality</p>
                    {renderStars(rating.serviceRating || 0)}
                  </div>
                  <div>
                    <p className="text-foreground mb-1">Overall Rating</p>
                    <div className="flex items-center">
                      {renderStars(Number(rating.overallRating) || 0)}
                      <span className="ml-2 text-lg font-semibold">
                        {Number(rating.overallRating).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Job Description & Feedback</h3>
                <p className="text-foreground whitespace-pre-wrap">{rating.overallText || "No job description or feedback provided."}</p>
              </div>

              {rating.acceptedBySupplier && rating.supplierComment && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Supplier Response</h3>
                    <p className="text-foreground whitespace-pre-wrap">{rating.supplierComment}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Rating Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canAcceptRating() && (
                <Alert className="bg-[#FFF4CE] text-[#7A6400] border-[#FFDA34]">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    Please review and accept this rating within 5 days. After acceptance, you can download the official rating document.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rating Status</span>
                  <Badge variant={rating.acceptedBySupplier ? "outline" : "secondary"}>
                    {rating.acceptedBySupplier ? "Accepted" : "Pending Review"}
                  </Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rated By</span>
                  <span className="text-sm font-medium">Operations Team</span>
                </div>

                {rating.acceptedBySupplier && rating.acceptedDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Accepted On</span>
                    <span className="text-sm font-medium">
                      {format(new Date(rating.acceptedDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Review Deadline</span>
                  <span className={`text-sm font-medium ${
                    !rating.acceptedBySupplier && differenceInDays(new Date(), new Date(rating.ratingDate)) > 3 
                      ? "text-red-500" 
                      : ""
                  }`}>
                    {format(
                      new Date(new Date(rating.ratingDate).setDate(new Date(rating.ratingDate).getDate() + 5)), 
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              {(isSupplier && rating.acceptedBySupplier) && (
                <Button 
                  onClick={downloadRatingPDF}
                  variant="outline"
                  className="w-full"
                >
                  <FileDown className="mr-2 h-4 w-4" /> Download As PDF
                </Button>
              )}
              
              {canAcceptRating() && (
                <Button 
                  onClick={() => setAcceptDialogOpen(true)}
                  className="w-full bg-[#0063B1] hover:bg-[#004c8a]"
                >
                  <ThumbsUp className="mr-2 h-4 w-4" /> Accept Rating
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Accept Performance Rating</DialogTitle>
            <DialogDescription>
              Once you accept this rating, it becomes official and can be used in future vendor assessments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Your Response (Optional)</h3>
              <Textarea
                placeholder="Add comments or feedback about this rating..."
                value={acceptComment}
                onChange={(e) => setAcceptComment(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Your response will be included in the official rating document
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => acceptRatingMutation.mutate({ comment: acceptComment })}
              className="bg-[#0063B1] hover:bg-[#004c8a]"
            >
              <FileCheck className="mr-2 h-4 w-4" /> Accept Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}