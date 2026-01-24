import { useState } from 'react';
import { useBatches } from '@/hooks/useBatches';
import { BatchCard } from '@/components/batch/BatchCard';
import { BatchDetailSheet } from '@/components/batch/BatchDetailSheet';
import { CreateBatchForm } from '@/components/batch/CreateBatchForm';
import { BatchWithDetails } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sprout, Package, TrendingUp, AlertTriangle } from 'lucide-react';

export function FarmerDashboard() {
  const { batches, loading, fetchBatches } = useBatches();
  const [selectedBatch, setSelectedBatch] = useState<BatchWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewBatch = (batch: BatchWithDetails) => {
    setSelectedBatch(batch);
    setDetailOpen(true);
  };

  // Calculate stats
  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.status !== 'analyzed').length;
  const analyzedBatches = batches.filter((b) => b.status === 'analyzed').length;
  const issuesBatches = batches.filter(
    (b) => b.vendor_receipt?.spoilage_percentage && b.vendor_receipt.spoilage_percentage > 10
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Farm Batches</h1>
          <p className="text-muted-foreground">Track your crops from harvest to market</p>
        </div>
        <CreateBatchForm onSuccess={fetchBatches} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-farmer/10">
                <Sprout className="h-5 w-5 text-farmer" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBatches}</p>
                <p className="text-xs text-muted-foreground">Total Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Package className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeBatches}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analyzedBatches}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{issuesBatches}</p>
                <p className="text-xs text-muted-foreground">Had Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sprout className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No batches yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first crop batch to start tracking quality from farm to market.
            </p>
            <CreateBatchForm onSuccess={fetchBatches} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              role="farmer"
              onView={handleViewBatch}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <BatchDetailSheet
        batch={selectedBatch}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefresh={fetchBatches}
      />
    </div>
  );
}
