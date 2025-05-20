import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertServiceTicketSchema, 
  ServiceTicket, 
  Supplier, 
  Project, 
  Agreement,
  PriceList,
  TicketItem
} from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Ticket, Plus, Trash, Send, CheckCircle } from "lucide-react";
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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ticketFormSchema = insertServiceTicketSchema.extend({
  id: z.number().optional(),
  dateCreated: z.string().optional(),
  dateSubmitted: z.string().optional(),
  dateApproved: z.string().optional(),
  status: z.string().optional(),
  createdBy: z.number().optional(),
  approvedBy: z.number().optional(),
  ticketNumber: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

const ticketItemSchema = z.object({
  id: z.number().optional(),
  ticketId: z.number().optional(),
  priceListItemId: z.number().optional(),
  positionDate: z.string().optional(),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  price: z.number(),
  totalPrice: z.number().optional(),
  description: z.string(),
  isNew: z.boolean().optional(),
});

type TicketItemFormValues = z.infer<typeof ticketItemSchema>;

export default function TicketForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newItem, setNewItem] = useState<TicketItemFormValues>({
    quantity: 1,
    price: 0,
    description: "",
    isNew: true,
  });
  const [selectedPriceList, setSelectedPriceList] = useState<number | null>(null);
  const [selectedPriceItem, setSelectedPriceItem] = useState<PriceList | null>(null);
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([]);
  
  const isEditing = !!id;
  const isSupplier = user?.role === "supplier";
  const isOperations = user?.role === "operations";

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      supplierId: isSupplier && user?.companyId ? user.companyId : undefined,
      projectId: undefined,
      agreementId: undefined,
      status: "draft",
      dateCreated: format(new Date(), "yyyy-MM-dd"),
    },
  });

  // Fetch ticket data if editing
  const { data: ticket, isLoading: isLoadingTicket } = useQuery<ServiceTicket & { items?: TicketItem[] }>({
    queryKey: ['/api/tickets', parseInt(id || '0')],
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
  const { data: agreements = [], isLoading: isLoadingAgreements } = useQuery<Agreement[]>({
    queryKey: ['/api/agreements', { supplierId: form.watch("supplierId") }],
    enabled: !!form.watch("supplierId"),
  });

  // Fetch price list for selected agreement
  const { data: priceList = [], isLoading: isLoadingPriceList } = useQuery<PriceList[]>({
    queryKey: ['/api/agreements', selectedPriceList, '/pricelist'],
    enabled: !!selectedPriceList,
  });
  
  // Define canEdit after all dependent data is fetched
  const canEdit = (isSupplier && (!isEditing || (ticket?.status === "draft" && ticket?.supplierId === user?.companyId))) || 
                 (isOperations && !isEditing);

  useEffect(() => {
    if (ticket) {
      // Format dates and ensure type safety for form compatibility
      const formattedTicket = {
        ...ticket,
        // Handle dates
        dateCreated: ticket.dateCreated ? format(new Date(ticket.dateCreated), "yyyy-MM-dd") : undefined,
        dateSubmitted: ticket.dateSubmitted ? format(new Date(ticket.dateSubmitted), "yyyy-MM-dd") : undefined,
        dateApproved: ticket.dateApproved ? format(new Date(ticket.dateApproved), "yyyy-MM-dd") : undefined,
        // Ensure null values are converted to undefined for the form
        createdBy: ticket.createdBy || undefined,
        approvedBy: ticket.approvedBy || undefined
      };
      
      // Type assertion to match the form's expected types
      form.reset(formattedTicket as any);
      
      if (ticket.agreementId) {
        setSelectedPriceList(ticket.agreementId);
      }
      
      if (ticket.items && ticket.items.length > 0) {
        setTicketItems(ticket.items);
      }
    }
  }, [ticket, form]);

  useEffect(() => {
    // When price list item is selected, update the new item form
    if (selectedPriceItem) {
      setNewItem({
        priceListItemId: selectedPriceItem.id,
        description: selectedPriceItem.shortText || '',  // Ensure description is never null
        price: selectedPriceItem.grossPrice ? Number(selectedPriceItem.grossPrice) : 0,
        quantity: 1,
        isNew: false,
      });
    }
  }, [selectedPriceItem]);

  const createMutation = useMutation({
    mutationFn: async (data: TicketFormValues) => {
      const res = await apiRequest("POST", "/api/tickets", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Service ticket created",
        description: "The service ticket has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      navigate(`/tickets/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create service ticket",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TicketFormValues) => {
      const res = await apiRequest("PUT", `/api/tickets/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Service ticket updated",
        description: "The service ticket has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', parseInt(id || '0')] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update service ticket",
        variant: "destructive",
      });
    },
  });

  const submitTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/tickets/${id}`, { status: "submitted" });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Service ticket submitted",
        description: "The service ticket has been submitted for approval",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', parseInt(id || '0')] });
      navigate("/tickets");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit service ticket",
        variant: "destructive",
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: TicketItemFormValues) => {
      // Calculate total price
      const totalPrice = item.quantity * item.price;
      const itemToAdd = {
        ...item,
        totalPrice,
        ticketId: parseInt(id || '0'),
      };
      
      const res = await apiRequest("POST", `/api/tickets/${id}/items`, itemToAdd);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Item added",
        description: "The item has been added to the service ticket",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', parseInt(id || '0')] });
      
      // Reset new item form
      setNewItem({
        quantity: 1,
        price: 0,
        description: "",
        isNew: true,
      });
      setSelectedPriceItem(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to service ticket",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: TicketFormValues) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleAddItem = () => {
    if (!newItem.description || newItem.quantity <= 0 || newItem.price < 0) {
      toast({
        title: "Missing information",
        description: "Please provide a description, valid quantity and price",
        variant: "destructive",
      });
      return;
    }
    
    if (!isEditing) {
      toast({
        title: "Save ticket first",
        description: "Please save the ticket before adding items",
      });
      return;
    }
    
    addItemMutation.mutate(newItem);
  };

  const handleSubmitTicket = () => {
    submitTicketMutation.mutate();
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.companyName : 'Unknown Supplier';
  };

  const getProjectName = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.projectName : 'Unknown Project';
  };

  const getAgreementName = (agreementId: number) => {
    const agreement = agreements.find(a => a.id === agreementId);
    return agreement ? `${agreement.agreementNumber} - ${agreement.agreementDescription || ''}` : 'Unknown Agreement';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "submitted":
        return <Badge variant="secondary">Submitted</Badge>;
      case "approved":
        return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isLoading = isLoadingTicket || createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title={isEditing ? "Service Ticket Details" : "New Service Ticket"}>
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="sm" className="mr-4" onClick={() => navigate("/tickets")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tickets
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEditing ? ticket?.ticketNumber || "Service Ticket Details" : "New Service Ticket"}
        </h1>
        
        {isEditing && ticket?.status && (
          <div className="ml-4">
            {getStatusBadge(ticket.status)}
          </div>
        )}
      </div>

      {isEditing && isLoadingTicket ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Ticket className="mr-2 h-5 w-5" />
                  Ticket Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier*</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            defaultValue={field.value?.toString()}
                            disabled={isSupplier || !canEdit}
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
                          <FormLabel>Project*</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            defaultValue={field.value?.toString()}
                            disabled={!canEdit}
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
                      name="agreementId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agreement</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              const agreementId = parseInt(value);
                              field.onChange(agreementId);
                              setSelectedPriceList(agreementId);
                            }} 
                            defaultValue={field.value?.toString()}
                            disabled={!canEdit || isLoadingAgreements}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an agreement" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {agreements.map((agreement) => (
                                <SelectItem 
                                  key={agreement.id} 
                                  value={agreement.id.toString()}
                                >
                                  {agreement.agreementNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isEditing && canEdit && (
                      <Button 
                        type="submit" 
                        className="w-full mt-4" 
                        disabled={isLoading}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isLoading ? "Saving..." : "Save Ticket"}
                      </Button>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>

            {isEditing && (
              <Card className="col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ticket Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Ticket Number</dt>
                      <dd className="text-base">{ticket?.ticketNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                      <dd className="text-base">{getStatusBadge(ticket?.status || 'draft')}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Supplier</dt>
                      <dd className="text-base">{ticket?.supplierId ? getSupplierName(ticket.supplierId) : 'Not selected'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Project</dt>
                      <dd className="text-base">{ticket?.projectId ? getProjectName(ticket.projectId) : 'Not selected'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Agreement</dt>
                      <dd className="text-base">{ticket?.agreementId ? getAgreementName(ticket.agreementId) : 'None'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Created Date</dt>
                      <dd className="text-base">{ticket?.dateCreated ? format(new Date(ticket.dateCreated), "MMM d, yyyy") : 'N/A'}</dd>
                    </div>
                    {ticket?.dateSubmitted && (
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Submitted Date</dt>
                        <dd className="text-base">{format(new Date(ticket.dateSubmitted), "MMM d, yyyy")}</dd>
                      </div>
                    )}
                    {ticket?.dateApproved && (
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Approved Date</dt>
                        <dd className="text-base">{format(new Date(ticket.dateApproved), "MMM d, yyyy")}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Total Value</dt>
                      <dd className="text-base font-medium">
                        {ticket?.totalValue
                          ? `€${parseFloat(ticket.totalValue.toString()).toFixed(2)}`
                          : '€0.00'}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
                <CardFooter>
                  {isEditing && ticket?.status === "draft" && canEdit && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="ml-auto">
                          <Send className="mr-2 h-4 w-4" /> Submit for Approval
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Submit Service Ticket</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to submit this service ticket for approval? 
                            You won't be able to edit it once submitted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSubmitTicket}>
                            Submit
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  {ticket?.status === "approved" && (
                    <Button className="ml-auto">
                      <CheckCircle className="mr-2 h-4 w-4" /> Approved
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )}
          </div>

          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Ticket className="mr-2 h-5 w-5" />
                  Service Items
                </CardTitle>
                <CardDescription>
                  Add service items to this ticket
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canEdit && (
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedPriceList && (
                        <div>
                          <label className="text-sm font-medium">Price List Item</label>
                          <Select
                            onValueChange={(value) => {
                              const item = priceList.find(i => i.id === parseInt(value));
                              if (item) {
                                setSelectedPriceItem(item);
                              }
                            }}
                            disabled={isLoadingPriceList}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select from price list" />
                            </SelectTrigger>
                            <SelectContent>
                              {priceList.map((item) => (
                                <SelectItem 
                                  key={item.id} 
                                  value={item.id.toString()}
                                >
                                  {item.positionNumber} - {item.shortText} (€{item.grossPrice})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Input 
                          placeholder="Item description" 
                          value={newItem.description} 
                          onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">Quantity</label>
                        <Input 
                          type="number" 
                          min="0.01" 
                          step="0.01" 
                          placeholder="Quantity" 
                          value={newItem.quantity} 
                          onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Price</label>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="Price" 
                          value={newItem.price} 
                          onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={handleAddItem} 
                          className="w-full"
                          disabled={addItemMutation.isPending}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {addItemMutation.isPending ? "Adding..." : "Add Item"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        {canEdit && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!ticket?.items || ticket.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-4 text-muted-foreground">
                            No items added to this ticket yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        ticket.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">€{Number(item.price).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">€{Number(item.totalPrice).toFixed(2)}</TableCell>
                            {canEdit && (
                              <TableCell>
                                <Button variant="ghost" size="icon">
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
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AppLayout>
  );
}
