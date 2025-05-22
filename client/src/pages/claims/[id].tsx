import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Edit, 
  Send, 
  User, 
  CalendarRange,
  Building,
  FileText,
  AlertOctagon,
  DollarSign,
  Clipboard,
  Mail
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Claim, Supplier, Project, User as UserType } from "@shared/schema";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

export default function ClaimDetailsPage() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [claimComment, setClaimComment] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");

  const isLegal = user?.role === "legal";
  const isOperations = user?.role === "operations";
  const isPurchasing = user?.role === "purchasing";
  const isSupplier = user?.role === "supplier";

  // Fetch claim data
  const { data: claim, isLoading } = useQuery<Claim>({
    queryKey: ['/api/claims', id],
    enabled: !!id,
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch users (for activity tracking)
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });

  const getSupplierName = (supplierId?: number) => {
    if (!supplierId) return 'Unknown Supplier';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.companyName : 'Unknown Supplier';
  };

  const getProjectName = (projectId?: number) => {
    if (!projectId) return 'N/A';
    const project = projects.find(p => p.id === projectId);
    return project ? project.projectName : 'Unknown Project';
  };

  const getUserName = (userId?: number) => {
    if (!userId) return 'System';
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.username : 'Unknown User';
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">New</Badge>;
    
    switch (status.toLowerCase()) {
      case 'new':
        return <Badge variant="outline">New</Badge>;
      case 'under review':
      case 'in review':
        return <Badge variant="secondary">Under Review</Badge>;
      case 'operations approved':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Operations Approved</Badge>;
      case 'legal approved':
        return <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">Legal Approved</Badge>;
      case 'sent to supplier':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Sent to Supplier</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'in negotiation':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">In Negotiation</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getClaimAreaBadge = (area?: string) => {
    if (!area) return null;
    
    switch (area) {
      case "Material":
        return <Badge variant="destructive">{area}</Badge>;
      case "Service":
        return <Badge variant="default">{area}</Badge>;
      case "HSE":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">{area}</Badge>;
      default:
        return <Badge>{area}</Badge>;
    }
  };

  // Determine if user can approve based on role and current status
  const canApprove = () => {
    if (!claim) return false;
    
    if (isOperations && 
        (claim.statusText === "New" || 
         claim.statusText === "Under review")) {
      return true;
    }
    
    if (isLegal && claim.statusText === "Operations approved") {
      return true;
    }
    
    return false;
  };

  // Determine if claim can be sent to supplier
  const canSendToSupplier = () => {
    if (!claim) return false;
    return isPurchasing && claim.statusText === "Legal approved";
  };

  // Determine if user can edit the claim
  const canEdit = () => {
    if (!claim) return false;
    
    // Purchasing can edit at beginning and end
    if (isPurchasing && 
        (claim.statusText === "New" || 
         claim.statusText === "Sent to supplier")) {
      return true;
    }
    
    // Operations can edit during their approval phase
    if (isOperations && 
        (claim.statusText === "Under review" || 
         claim.statusText === "Operations approved")) {
      return true;
    }
    
    // Legal can edit during their approval phase
    if (isLegal && 
        (claim.statusText === "Operations approved" || 
         claim.statusText === "Legal approved")) {
      return true;
    }
    
    // Supplier can only provide feedback after claim is sent
    if (isSupplier && 
        claim.statusText === "Sent to supplier" && 
        claim.supplierId === user?.companyId) {
      return true;
    }
    
    return false;
  };

  // Update claim status mutation
  const updateClaimStatusMutation = useMutation({
    mutationFn: async (data: { status: string, comment?: string }) => {
      const response = await fetch(`/api/claims/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update claim status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/claims', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      
      toast({
        title: "Status updated successfully",
        description: "The claim status has been updated.",
      });
      
      setApproveDialogOpen(false);
      setRejectDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send to supplier mutation
  const sendToSupplierMutation = useMutation({
    mutationFn: async (data: { comment?: string }) => {
      const response = await fetch(`/api/claims/${id}/send-to-supplier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send claim to supplier');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/claims', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      
      toast({
        title: "Claim sent to supplier",
        description: "The claim has been sent to the supplier via email.",
      });
      
      setOpenSendDialog(false);
      setClaimComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Supplier response mutation
  const supplierResponseMutation = useMutation({
    mutationFn: async (data: { accepted: boolean, comment: string }) => {
      const response = await fetch(`/api/claims/${id}/supplier-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit response');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/claims', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/claims'] });
      
      toast({
        title: "Response submitted",
        description: "Your response has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit response",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle claim approval
  const handleApprove = () => {
    let newStatusValue = "";
    
    if (isOperations) {
      newStatusValue = "Operations approved";
    } else if (isLegal) {
      newStatusValue = "Legal approved";
    }
    
    if (newStatusValue) {
      updateClaimStatusMutation.mutate({ 
        status: newStatusValue,
        comment: statusComment
      });
    }
  };

  // Handle claim rejection
  const handleReject = () => {
    if (statusComment.trim() === "") {
      toast({
        title: "Comment required",
        description: "Please provide a reason for rejecting the claim.",
        variant: "destructive",
      });
      return;
    }
    
    updateClaimStatusMutation.mutate({ 
      status: "Rejected",
      comment: statusComment
    });
  };

  // Handle sending claim to supplier
  const handleSendToSupplier = () => {
    sendToSupplierMutation.mutate({ comment: claimComment });
  };

  // Handle supplier response
  const handleSupplierResponse = (accepted: boolean) => {
    if (claimComment.trim() === "") {
      toast({
        title: "Comment required",
        description: "Please provide a comment with your response.",
        variant: "destructive",
      });
      return;
    }
    
    supplierResponseMutation.mutate({ 
      accepted,
      comment: claimComment
    });
  };

  if (isLoading || !claim) {
    return (
      <AppLayout title="Claim Details">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Claim: ${claim.claimNumber}`}>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setLocation("/claims")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Claim {claim.claimNumber}
            </h1>
            <div className="flex items-center gap-2">
              {getStatusBadge(claim.statusText)}
              {getClaimAreaBadge(claim.claimArea)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit() && (
            <Button variant="outline" onClick={() => setEditMode(!editMode)}>
              <Edit className="mr-2 h-4 w-4" />
              {editMode ? "View Details" : "Edit Claim"}
            </Button>
          )}
          
          {canApprove() && (
            <>
              <Button 
                className="bg-[#0063B1] hover:bg-[#004c8a]"
                onClick={() => setApproveDialogOpen(true)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
              
              <Button 
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          
          {canSendToSupplier() && (
            <Button 
              className="bg-[#0063B1] hover:bg-[#004c8a]"
              onClick={() => setOpenSendDialog(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              Send to Supplier
            </Button>
          )}
          
          {isSupplier && 
           claim.supplierId === user?.companyId && 
           claim.statusText === "Sent to supplier" && (
            <Dialog open={openSendDialog} onOpenChange={setOpenSendDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Respond to Claim
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Respond to Claim</DialogTitle>
                  <DialogDescription>
                    Please provide your response to this claim
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Comment</label>
                    <Textarea
                      placeholder="Enter your response to this claim..."
                      value={claimComment}
                      onChange={(e) => setClaimComment(e.target.value)}
                      rows={5}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenSendDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleSupplierResponse(false)}
                    disabled={supplierResponseMutation.isPending}
                  >
                    Reject Claim
                  </Button>
                  <Button 
                    onClick={() => handleSupplierResponse(true)}
                    disabled={supplierResponseMutation.isPending}
                    className="bg-[#0063B1] hover:bg-[#004c8a]"
                  >
                    Accept Claim
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Claim Details</CardTitle>
              <CardDescription>
                Information about the claim and damage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Supplier</div>
                  <div className="flex items-center">
                    <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{getSupplierName(claim.supplierId)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Project</div>
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{getProjectName(claim.projectId)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Date Happened</div>
                  <div className="flex items-center">
                    <CalendarRange className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {claim.dateHappened && format(new Date(claim.dateHappened), "MMMM dd, yyyy")}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Damage Amount</div>
                  <div className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {typeof claim.damageAmount === 'number' || typeof claim.damageAmount === 'string'
                        ? `€${Number(claim.damageAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Created By</div>
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{getUserName(claim.createdBy)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Date Submitted</div>
                  <div className="flex items-center">
                    <CalendarRange className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {claim.dateEntered && format(new Date(claim.dateEntered), "MMMM dd, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Claim Description</h3>
                  <p className="text-muted-foreground">{claim.claimInfo || 'No description provided.'}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Damage Description</h3>
                  <p className="text-muted-foreground">{claim.damageText || 'No damage description provided.'}</p>
                </div>
                
                {claim.defectsDescription && (
                  <div>
                    <h3 className="font-medium mb-2">Defects Description</h3>
                    <p className="text-muted-foreground">{claim.defectsDescription}</p>
                  </div>
                )}
              </div>
              
              {(claim.demandType || claim.demandText) && (
                <>
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Demand Details</h3>
                    {claim.demandType && (
                      <div className="mb-2">
                        <span className="text-sm text-muted-foreground mr-2">Type:</span>
                        <Badge variant="outline">{claim.demandType}</Badge>
                      </div>
                    )}
                    {claim.demandText && (
                      <p className="text-muted-foreground">{claim.demandText}</p>
                    )}
                  </div>
                </>
              )}
              
              {claim.acceptedBySupplier !== null && (
                <>
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Supplier Response</h3>
                    <div className="mb-2">
                      <span className="text-sm text-muted-foreground mr-2">Status:</span>
                      {claim.acceptedBySupplier 
                        ? <Badge className="bg-green-100 text-green-800">Accepted</Badge> 
                        : <Badge variant="destructive">Rejected</Badge>}
                    </div>
                    {claim.acceptedSupplierText && (
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-muted-foreground">{claim.acceptedSupplierText}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Activity Timeline Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Claim Timeline</CardTitle>
              <CardDescription>
                History of actions and updates for this claim
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-muted pl-6 ml-2 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[29px] p-1 bg-primary rounded-full">
                    <Clipboard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">Claim Created</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(claim.dateEntered), "MMMM dd, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-sm mt-1">
                      Created by {getUserName(claim.createdBy)} with status: <Badge variant="outline">New</Badge>
                    </p>
                  </div>
                </div>
                
                {claim.statusText !== "New" && (
                  <div className="relative">
                    <div className="absolute -left-[29px] p-1 bg-primary rounded-full">
                      <AlertOctagon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">Status Updated</h4>
                      <p className="text-sm text-muted-foreground">
                        {/* This would come from activity logs in a real implementation */}
                        {format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}
                      </p>
                      <p className="text-sm mt-1">
                        Status changed to: {getStatusBadge(claim.statusText)}
                      </p>
                    </div>
                  </div>
                )}
                
                {claim.dateSentToSupplier && (
                  <div className="relative">
                    <div className="absolute -left-[29px] p-1 bg-primary rounded-full">
                      <Mail className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">Sent to Supplier</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(claim.dateSentToSupplier), "MMMM dd, yyyy 'at' h:mm a")}
                      </p>
                      <p className="text-sm mt-1">
                        Claim sent to {getSupplierName(claim.supplierId)}
                      </p>
                    </div>
                  </div>
                )}
                
                {claim.dateFeedback && (
                  <div className="relative">
                    <div className="absolute -left-[29px] p-1 bg-primary rounded-full">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">Supplier Response</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(claim.dateFeedback), "MMMM dd, yyyy 'at' h:mm a")}
                      </p>
                      <p className="text-sm mt-1">
                        Supplier {claim.acceptedBySupplier ? 'accepted' : 'rejected'} the claim
                      </p>
                      {claim.acceptedSupplierText && (
                        <div className="p-3 bg-muted rounded-md mt-2 text-sm">
                          {claim.acceptedSupplierText}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          {/* Related Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Related Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {claim.agreementId && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Related Agreement</h3>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">Agreement #{claim.agreementId}</p>
                    <p className="text-sm text-muted-foreground">
                      {/* This would pull the actual agreement title in a real implementation */}
                      Framework Agreement
                    </p>
                  </div>
                </div>
              )}
              
              {claim.orderNumber && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Order Number</h3>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{claim.orderNumber}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Status Management Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Claim Status</CardTitle>
              <CardDescription>
                Current status: {getStatusBadge(claim.statusText)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Status progression indicators */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${claim.statusText !== "New" ? "bg-green-500" : "bg-muted"}`}>
                      <span className="text-white font-medium">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Purchasing</p>
                      <p className="text-xs text-muted-foreground">Initial claim creation</p>
                    </div>
                    {claim.statusText !== "New" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  </div>
                  
                  <div className="h-8 w-px bg-muted ml-4"></div>
                  
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${claim.statusText === "Operations approved" || claim.statusText === "Legal approved" || claim.statusText === "Sent to supplier" ? "bg-green-500" : "bg-muted"}`}>
                      <span className="text-white font-medium">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Operations</p>
                      <p className="text-xs text-muted-foreground">Review and approval</p>
                    </div>
                    {(claim.statusText === "Operations approved" || claim.statusText === "Legal approved" || claim.statusText === "Sent to supplier") && 
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    }
                  </div>
                  
                  <div className="h-8 w-px bg-muted ml-4"></div>
                  
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${claim.statusText === "Legal approved" || claim.statusText === "Sent to supplier" ? "bg-green-500" : "bg-muted"}`}>
                      <span className="text-white font-medium">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Legal</p>
                      <p className="text-xs text-muted-foreground">Legal review and approval</p>
                    </div>
                    {(claim.statusText === "Legal approved" || claim.statusText === "Sent to supplier") && 
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    }
                  </div>
                  
                  <div className="h-8 w-px bg-muted ml-4"></div>
                  
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${claim.statusText === "Sent to supplier" ? "bg-green-500" : "bg-muted"}`}>
                      <span className="text-white font-medium">4</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Send to Supplier</p>
                      <p className="text-xs text-muted-foreground">Final notification to supplier</p>
                    </div>
                    {claim.statusText === "Sent to supplier" && 
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Claim</DialogTitle>
            <DialogDescription>
              You are about to approve this claim. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment (Optional)</label>
              <Textarea
                placeholder="Add a comment with your approval..."
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={updateClaimStatusMutation.isPending}
              className="bg-[#0063B1] hover:bg-[#004c8a]"
            >
              {updateClaimStatusMutation.isPending ? "Processing..." : "Approve Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>
              You are about to reject this claim. Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rejection *</label>
              <Textarea
                placeholder="Explain why this claim is being rejected..."
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">* Required field</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={updateClaimStatusMutation.isPending}
            >
              {updateClaimStatusMutation.isPending ? "Processing..." : "Reject Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Supplier Dialog */}
      <Dialog open={openSendDialog} onOpenChange={setOpenSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Claim to Supplier</DialogTitle>
            <DialogDescription>
              This will send an email notification to {getSupplierName(claim.supplierId)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Message (Optional)</label>
              <Textarea
                placeholder="Add any additional information for the supplier..."
                value={claimComment}
                onChange={(e) => setClaimComment(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSendDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendToSupplier}
              disabled={sendToSupplierMutation.isPending}
              className="bg-[#0063B1] hover:bg-[#004c8a]"
            >
              <Mail className="mr-2 h-4 w-4" />
              {sendToSupplierMutation.isPending ? "Sending..." : "Send to Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}