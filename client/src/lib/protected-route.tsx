import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requiredRoles
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRoles?: string[];
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !user ? (
        <Redirect to="/auth" />
      ) : requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role) ? (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 text-center">
            You don't have permission to access this page. This area requires {requiredRoles.join(' or ')} role.
          </p>
        </div>
      ) : (
        <Component />
      )}
    </Route>
  );
}
