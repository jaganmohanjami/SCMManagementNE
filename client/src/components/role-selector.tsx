import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCog, ShieldCheck, Calculator, Scale, Building2, Building } from "lucide-react";

const roles = [
  { id: "admin", name: "System Administrator", icon: ShieldCheck, color: "bg-red-500" },
  { id: "purchasing", name: "Purchasing Manager", icon: UserCog, color: "bg-blue-500" },
  { id: "operations", name: "Operations Manager", icon: Users, color: "bg-green-500" },
  { id: "accounting", name: "Accounting Manager", icon: Calculator, color: "bg-yellow-500" },
  { id: "legal", name: "Legal Manager", icon: Scale, color: "bg-purple-500" },
  { id: "management", name: "Senior Management", icon: Building2, color: "bg-slate-500" },
  { id: "supplier", name: "Supplier Representative", icon: Building, color: "bg-orange-500" },
];

export function RoleSelector() {
  const { user, switchUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState(user?.role || "admin");

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    if (switchUser) {
      switchUser(role);
    }
  };

  if (!switchUser) return null; // Hide if no switchUser function is provided

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-md font-medium flex items-center">
          <UserCog className="mr-2 h-4 w-4" />
          Role Selection
          <Badge variant="outline" className="ml-2">Demo Mode</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Select value={selectedRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  <div className="flex items-center">
                    <role.icon className="mr-2 h-4 w-4" />
                    <span>{role.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="text-sm text-muted-foreground">
            Current User: <strong>{user?.name}</strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}