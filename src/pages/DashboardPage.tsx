import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FarmerDashboard } from '@/components/dashboard/FarmerDashboard';
import { TransporterDashboard } from '@/components/dashboard/TransporterDashboard';
import { VendorDashboard } from '@/components/dashboard/VendorDashboard';
import { Loader2 } from 'lucide-react';

export function DashboardPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout>
      {profile.role === 'farmer' && <FarmerDashboard />}
      {profile.role === 'transporter' && <TransporterDashboard />}
      {profile.role === 'vendor' && <VendorDashboard />}
    </DashboardLayout>
  );
}
