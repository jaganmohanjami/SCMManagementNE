import { AppLayout } from "@/components/layout/app-layout";

export default function TestPage() {
  return (
    <AppLayout title="Test Page">
      <div className="p-8 text-center">
        <h1 className="text-3xl font-bold text-[#0063B1] mb-6">Neptune Energy SCM Vendor Management</h1>
        <p className="text-xl mb-4">This is a test page to verify the application is working</p>
        <div className="p-4 bg-[#0063B1] text-white rounded-md inline-block">
          This confirms the application is running correctly
        </div>
      </div>
    </AppLayout>
  );
}