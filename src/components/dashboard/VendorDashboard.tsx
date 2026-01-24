import { useState } from 'react';
import { useBatches } from '@/hooks/useBatches';
import { BatchCard } from '@/components/batch/BatchCard';
import { BatchDetailSheet } from '@/components/batch/BatchDetailSheet';
import { BatchWithDetails } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Package, Clock, CheckCircle, Brain, TrendingDown } from 'lucide-react';

export function VendorDashboard() {
  const { batches, loading, fetchBatches } = useBatches();
  const [selectedBatch, setSelectedBatch] = useState<BatchWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewBatch = (batch: BatchWithDetails) => {
    setSelectedBatch(batch);
    setDetailOpen(true);
  };

  // Filter batches for vendor view
  const incomingBatches = batches.filter((b) => ['in_transit', 'delivered'].includes(b.status) && !b.vendor_receipt);
  const pendingReceiptBatches = batches.filter(
    (b) => b.vendor_receipt && !['received', 'analyzed'].includes(b.status)
  );
  const receivedBatches = batches.filter(
    (b) => b.vendor_receipt && ['received', 'analyzed'].includes(b.status)
  );

  // Stats
  const totalReceived = receivedBatches.length;
  const incomingCount = incomingBatches.length;
  const analyzedCount = batches.filter((b) => b.ai_analysis).length;
  const avgSpoilage = receivedBatches.length > 0
    ? (
        receivedBatches.reduce((acc, b) => acc + (b.vendor_receipt?.spoilage_percentage || 0), 0) /
        receivedBatches.length
      ).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">Vendor Dashboard</h1>
        <p className="text-muted-foreground">Receive and grade incoming crop shipments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{incomingCount}</p>
                <p className="text-xs text-muted-foreground">Incoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vendor/10">
                <Store className="h-5 w-5 text-vendor" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReceived}</p>
                <p className="text-xs text-muted-foreground">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analyzedCount}</p>
                <p className="text-xs text-muted-foreground">Analyzed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgSpoilage}%</p>
                <p className="text-xs text-muted-foreground">Avg Spoilage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different batch states */}
      <Tabs defaultValue="incoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="incoming" className="gap-2">
            <Package className="h-4 w-4" />
            Incoming ({incomingBatches.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending Receipt ({pendingReceiptBatches.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Received ({receivedBatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          {loading ? (
            <LoadingGrid />
          ) : incomingBatches.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No incoming batches"
              description="Batches in transit will appear here."
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomingBatches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  role="vendor"
                  onView={handleViewBatch}
                  actionLabel="Accept"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {loading ? (
            <LoadingGrid />
          ) : pendingReceiptBatches.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No pending receipts"
              description="Batches waiting to be graded will appear here."
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingReceiptBatches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  role="vendor"
                  onView={handleViewBatch}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received">
          {loading ? (
            <LoadingGrid />
          ) : receivedBatches.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No received batches"
              description="Completed receipts will appear here."
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receivedBatches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  role="vendor"
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
