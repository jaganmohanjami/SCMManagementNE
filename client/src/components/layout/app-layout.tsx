import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { PropsWithChildren } from "react";

interface AppLayoutProps extends PropsWithChildren {
  title: string;
}

export function AppLayout({ title, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto ml-64 bg-background">
        <Header title={title} />
        
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
