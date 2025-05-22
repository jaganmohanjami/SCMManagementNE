import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CustomAuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import SuppliersPage from "@/pages/suppliers";
import SupplierForm from "@/pages/suppliers/supplier-form";
import AgreementsPage from "@/pages/agreements";
import AgreementForm from "@/pages/agreements/agreement-form";
import ServiceTicketsPage from "@/pages/service-tickets";
import TicketForm from "@/pages/service-tickets/ticket-form";
import ClaimsPage from "@/pages/claims";
import ClaimForm from "@/pages/claims/claim-form";
import SupplierRatingsPage from "@/pages/supplier-ratings";
import RatingForm from "@/pages/supplier-ratings/rating-form";
import RequestRatingPage from "@/pages/supplier-ratings/request-rating";
import UserManagementPage from "@/pages/user-management";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      
      {/* Supplier routes */}
      <ProtectedRoute 
        path="/suppliers" 
        component={SuppliersPage} 
        requiredRoles={["purchasing", "management"]}
      />
      <ProtectedRoute 
        path="/suppliers/new" 
        component={SupplierForm} 
        requiredRoles={["purchasing"]}
      />
      <ProtectedRoute 
        path="/suppliers/:id" 
        component={SupplierForm} 
        requiredRoles={["purchasing"]}
      />
      
      {/* Agreement routes */}
      <ProtectedRoute 
        path="/agreements" 
        component={AgreementsPage} 
        requiredRoles={["purchasing", "management", "supplier"]}
      />
      <ProtectedRoute 
        path="/agreements/new" 
        component={AgreementForm} 
        requiredRoles={["purchasing"]}
      />
      <ProtectedRoute 
        path="/agreements/:id" 
        component={AgreementForm} 
        requiredRoles={["purchasing", "supplier"]}
      />
      
      {/* Service Ticket routes */}
      <ProtectedRoute 
        path="/tickets" 
        component={ServiceTicketsPage} 
        requiredRoles={["purchasing", "operations", "accounting", "management", "supplier"]}
      />
      <ProtectedRoute 
        path="/tickets/new" 
        component={TicketForm} 
        requiredRoles={["operations", "supplier"]}
      />
      <ProtectedRoute 
        path="/tickets/:id" 
        component={TicketForm} 
      />
      
      {/* Claims routes */}
      <ProtectedRoute 
        path="/claims" 
        component={ClaimsPage}
        requiredRoles={["purchasing", "legal", "management", "supplier"]} 
      />
      <ProtectedRoute 
        path="/claims/new" 
        component={ClaimForm}
        requiredRoles={["legal", "operations", "purchasing"]} 
      />
      <ProtectedRoute 
        path="/claims/:id" 
        component={ClaimForm}
        requiredRoles={["legal", "supplier", "management"]} 
      />
      
      {/* Supplier Rating routes */}
      <ProtectedRoute 
        path="/ratings" 
        component={SupplierRatingsPage}
        requiredRoles={["purchasing", "operations", "management", "supplier"]} 
      />
      <ProtectedRoute 
        path="/ratings/new" 
        component={RatingForm}
        requiredRoles={["operations"]} 
      />
      <ProtectedRoute 
        path="/ratings/request" 
        component={RequestRatingPage}
        requiredRoles={["supplier"]} 
      />
      <ProtectedRoute 
        path="/ratings/:id" 
        component={RatingForm}
        requiredRoles={["operations", "purchasing", "management"]} 
      />
      
      {/* User Management */}
      <ProtectedRoute 
        path="/users" 
        component={UserManagementPage}
        requiredRoles={["purchasing"]} 
      />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <CustomAuthProvider>
        <Toaster />
        <Router />
      </CustomAuthProvider>
    </TooltipProvider>
  );
}

export default App;
