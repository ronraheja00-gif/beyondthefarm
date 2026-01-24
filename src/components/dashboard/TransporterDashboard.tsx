import { useState } from 'react';
import { useBatches } from '@/hooks/useBatches';
import { BatchCard } from '@/components/batch/BatchCard';
import { BatchDetailSheet } from '@/components/batch/BatchDetailSheet';
import { BatchWithDetails } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Package, Clock, CheckCircle } from 'lucide-react';

export function TransporterDashboard() {
  const { batches, loading, fetchBatches } = useBatches();
  const [selectedBatch, setSelectedBatch] = useState<BatchWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewBatch = (batch: BatchWithDetails) => {
    setSelectedBatch(batch);
    setDetailOpen(true);
  };

  // Filter batches for transporter view
  const availableBatches = batches.filter((b) => b.status === 'created');
  const myActiveBatches = batches.filter(
    (b) => b.transport_log && ['assigned_transporter', 'picked_up', 'in_transit'].includes(b.status)
  );
  const completedBatches = batches.filter(
    (b) => b.transport_log && ['delivered', 'received', 'analyzed'].includes(b.status)
  );

  // Stats
  const totalDeliveries = completedBatches.length;
  const activeDeliveries = myActiveBatches.length;
  const pendingPickups = availableBatches.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">Transporter Dashboard</h1>
        <p className="text-muted-foreground">Manage pickups and deliveries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingPickups}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-transporter/10">
                <Truck className="h-5 w-5 text-transporter" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeDeliveries}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDeliveries}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different batch states */}
      <Tabs defaultValue="available" className="space-y-4">
        <TabsList>
          <TabsTrigger value="available" className="gap-2">
            <Package className="h-4 w-4" />
            Available ({pendingPickups})
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Truck className="h-4 w-4" />
            My Active ({activeDeliveries})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({completedBatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          {loading ? (
            <LoadingGrid />
          ) : availableBatches.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No batches available"
              description="Check back later for new batches to pick up."
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableBatches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  role="transporter"
                  onView={handleViewBatch}
                  actionLabel="Accept"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          {loading ? (
            <LoadingGrid />
          ) : myActiveBatches.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No active deliveries"
              description="Accept a batch from the Available tab to start a delivery."
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myActiveBatches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  role="transporter"
                  onView={handleViewBatch}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {loading ? (
            <LoadingGrid />
          ) : completedBatches.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No completed deliveries"
              description="Completed deliveries will appear here."
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedBatches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  role="transporter"
                  onView={handleViewBatch}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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

function LoadingGrid() {
  return (
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
  );
}

interface EmptyStateProps {
  icon: typeof Package;
  title: string;
  description: string;
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground text-center">{description}</p>
      </CardContent>
    </Card>
  );
}
