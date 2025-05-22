import { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  switchUser?: (role: string) => void; // Added for role switching
};

export type LoginData = {
  username: string;
  password: string;
};

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterData = z.infer<typeof registerSchema>;

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const AuthContext = createContext<AuthContextType | null>(null);

// Sample user data for different roles
const sampleUsers: Record<string, User> = {
  admin: {
    id: 1,
    username: 'admin',
    name: 'System Administrator',
    email: 'admin@neptune.com',
    role: 'purchasing',
    companyId: null,
    password: 'admin123' // Normally wouldn't include password, just for demo
  },
  purchasing: {
    id: 2,
    username: 'purchasing',
    name: 'Purchasing Manager',
    email: 'purchasing@neptune.com',
    role: 'purchasing',
    companyId: null,
    password: 'purchasing123'
  },
  operations: {
    id: 3,
    username: 'operations',
    name: 'Operations Manager',
    email: 'operations@neptune.com',
    role: 'operations',
    companyId: null,
    password: 'operations123'
  },
  accounting: {
    id: 4,
    username: 'accounting',
    name: 'Accounting Manager',
    email: 'accounting@neptune.com',
    role: 'accounting',
    companyId: null,
    password: 'accounting123'
  },
  legal: {
    id: 5,
    username: 'legal',
    name: 'Legal Manager',
    email: 'legal@neptune.com',
    role: 'legal',
    companyId: null,
    password: 'legal123'
  },
  management: {
    id: 6,
    username: 'management',
    name: 'Senior Manager',
    email: 'management@neptune.com',
    role: 'management',
    companyId: null,
    password: 'management123'
  },
  supplier: {
    id: 7,
    username: 'supplier',
    name: 'Supplier Representative',
    email: 'supplier@vendor.com',
    role: 'supplier',
    companyId: 1,
    password: 'supplier123'
  }
};

// Regular AuthProvider that uses the API
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const parsedCredentials = loginSchema.parse(credentials);
      const res = await apiRequest("POST", "/api/login", parsedCredentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      console.log('Login successful, updating user data:', user);
      // Set the user data immediately
      queryClient.setQueryData(["/api/user"], user);
      
      // Wait for state to update before showing toast
      setTimeout(() => {
        toast({
          title: "Login successful",
          description: `Welcome back, ${user.name}!`,
        });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const parsedData = registerSchema.parse(data);
      const { confirmPassword, ...userData } = parsedData;
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom Auth Provider that uses local state instead of API
export function CustomAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  // Initialize with admin user to show all test data
  const [user, setUser] = useState<User | null>(sampleUsers.admin);
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to switch between different user roles
  const switchUser = (role: string) => {
    if (sampleUsers[role]) {
      setUser(sampleUsers[role]);
      toast({
        title: "Role Changed",
        description: `Now logged in as ${sampleUsers[role].name}`,
      });
    } else {
      toast({
        title: "Invalid Role",
        description: "The selected role does not exist",
        variant: "destructive",
      });
    }
  };

  // Mock mutations that don't actually call the API
  const loginMutation = {
    isPending: false,
    mutate: (credentials: LoginData) => {
      setIsLoading(true);
      setTimeout(() => {
        const foundUser = Object.values(sampleUsers).find(
          u => u.username === credentials.username && u.password === credentials.password
        );
        
        if (foundUser) {
          setUser(foundUser);
          toast({
            title: "Login successful",
            description: `Welcome back, ${foundUser.name}!`,
          });
        } else {
          toast({
            title: "Login failed",
            description: "Invalid username or password",
            variant: "destructive",
          });
        }
        setIsLoading(false);
      }, 500);
    }
  } as UseMutationResult<User, Error, LoginData>;

  const logoutMutation = {
    isPending: false,
    mutate: () => {
      setIsLoading(true);
      setTimeout(() => {
        setUser(null);
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
        setIsLoading(false);
      }, 500);
    }
  } as UseMutationResult<void, Error, void>;

  const registerMutation = {
    isPending: false,
    mutate: (data: RegisterData) => {
      setIsLoading(true);
      setTimeout(() => {
        const newUser: User = {
          id: Math.floor(Math.random() * 1000) + 10,
          username: data.username,
          name: data.name,
          email: data.email,
          role: data.role,
          companyId: data.companyId || null,
          password: data.password
        };
        
        setUser(newUser);
        toast({
          title: "Registration successful",
          description: `Welcome, ${newUser.name}!`,
        });
        setIsLoading(false);
      }, 500);
    }
  } as UseMutationResult<User, Error, RegisterData>;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error: null,
        loginMutation,
        logoutMutation,
        registerMutation,
        switchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
