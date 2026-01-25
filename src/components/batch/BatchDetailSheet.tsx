import { useState } from 'react';
import { BatchWithDetails } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { BatchTimeline } from './BatchTimeline';
import { AIAnalysisCard } from './AIAnalysisCard';
import { TransportUpdateForm } from './TransportUpdateForm';
import { VendorReceiptForm } from './VendorReceiptForm';
import { BatchJourneyMap } from './BatchJourneyMap';
import { WeatherSector } from './WeatherSector';
import { useBatches } from '@/hooks/useBatches';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Sprout,
  Package,
  MapPin,
  Clock,
  Scale,
  Loader2,
  Brain,
  Truck,
  Store,
  Map,
  CloudSun,
} from 'lucide-react';

interface BatchDetailSheetProps {
  batch: BatchWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

export function BatchDetailSheet({ batch, open, onOpenChange, onRefresh }: BatchDetailSheetProps) {
  const { profile } = useAuth();
  const { acceptBatchAsTransporter, acceptBatchAsVendor, runAIAnalysis } = useBatches();
  const [loading, setLoading] = useState(false);
  const [transportFormOpen, setTransportFormOpen] = useState(false);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);

  if (!batch || !profile) return null;

  const handleAcceptAsTransporter = async () => {
    setLoading(true);
    try {
      await acceptBatchAsTransporter(batch.id);
      toast({
        title: 'Batch Accepted!',
        description: 'You have been assigned as the transporter.',
      });
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept batch.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAsVendor = async () => {
    setLoading(true);
    try {
      await acceptBatchAsVendor(batch.id);
      toast({
        title: 'Batch Accepted!',
        description: 'You have been assigned as the vendor.',
      });
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept batch.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      await runAIAnalysis(batch.id);
      toast({
        title: 'Analysis Complete!',
        description: 'AI analysis has been completed.',
      });
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run analysis.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              {batch.crop_type} Batch
            </SheetTitle>
            <SheetDescription>
              Created on {format(new Date(batch.created_at), 'MMMM d, yyyy')}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Batch Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Batch Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Harvest Time
                  </span>
                  <span>{format(new Date(batch.harvest_time), 'MMM d, yyyy h:mm a')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Scale className="h-4 w-4" />
                    Quantity
                  </span>
                  <span>{batch.quantity_kg} kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    Expected Quality
                  </span>
                  <span className="capitalize">{batch.expected_quality.replace('_', ' ')}</span>
                </div>
                {batch.farm_address && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Farm Location
                    </span>
                    <span className="text-right max-w-[200px] truncate">{batch.farm_address}</span>
                  </div>
                )}
                {batch.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-1">Notes:</p>
                    <p>{batch.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role-specific Actions */}
            {profile.role === 'transporter' && batch.status === 'created' && (
              <Card className="border-transporter/30 bg-transporter/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Truck className="h-8 w-8 text-transporter" />
                    <div className="flex-1">
                      <h4 className="font-medium">Accept This Batch</h4>
                      <p className="text-sm text-muted-foreground">
                        This batch is ready for pickup. Accept it to become the transporter.
                      </p>
                    </div>
                    <Button onClick={handleAcceptAsTransporter} disabled={loading} className="bg-transporter hover:bg-transporter/90">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {profile.role === 'transporter' && ['assigned_transporter', 'picked_up', 'in_transit'].includes(batch.status) && batch.transport_log && (
              <Card className="border-transporter/30 bg-transporter/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Truck className="h-8 w-8 text-transporter" />
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {batch.status === 'assigned_transporter' ? 'Record Pickup' : 'Record Delivery'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {batch.status === 'assigned_transporter'
                          ? 'Mark this batch as picked up from the farm.'
                          : 'Mark this batch as delivered to the vendor.'}
                      </p>
                    </div>
                    <Button onClick={() => setTransportFormOpen(true)} className="bg-transporter hover:bg-transporter/90">
                      {batch.status === 'assigned_transporter' ? 'Pickup' : 'Deliver'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {profile.role === 'vendor' && batch.status === 'delivered' && !batch.vendor_receipt && (
              <Card className="border-vendor/30 bg-vendor/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Store className="h-8 w-8 text-vendor" />
                    <div className="flex-1">
                      <h4 className="font-medium">Accept Delivery</h4>
                      <p className="text-sm text-muted-foreground">
                        This batch has been delivered. Accept it to record receipt.
                      </p>
                    </div>
                    <Button onClick={handleAcceptAsVendor} disabled={loading} className="bg-vendor hover:bg-vendor/90">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {profile.role === 'vendor' && batch.vendor_receipt && batch.status !== 'received' && batch.status !== 'analyzed' && (
              <Card className="border-vendor/30 bg-vendor/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Store className="h-8 w-8 text-vendor" />
                    <div className="flex-1">
                      <h4 className="font-medium">Confirm Receipt</h4>
                      <p className="text-sm text-muted-foreground">
                        Record the quality and condition of the received batch.
                      </p>
                    </div>
                    <Button onClick={() => setVendorFormOpen(true)} className="bg-vendor hover:bg-vendor/90">
                      Confirm
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Run Analysis Button */}
            {batch.status === 'received' && !batch.ai_analysis && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Brain className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-medium">Run AI Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        Analyze the crop journey and get insights on quality degradation.
                      </p>
                    </div>
                    <Button onClick={handleRunAnalysis} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Journey Map */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Journey Map
                </CardTitle>
                <CardDescription>Visual route from farm to vendor</CardDescription>
              </CardHeader>
              <CardContent>
                <BatchJourneyMap batch={batch} />
              </CardContent>
            </Card>

            <Separator />

            {/* Weather Sector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CloudSun className="h-4 w-4" />
                  Weather Conditions
                </CardTitle>
                <CardDescription>Environmental data captured at each stage</CardDescription>
              </CardHeader>
              <CardContent>
                <WeatherSector environmentalData={batch.environmental_data} />
              </CardContent>
            </Card>

            <Separator />

            {/* Timeline */}
            <BatchTimeline batch={batch} />

            {/* AI Analysis */}
            {batch.ai_analysis && (
              <>
                <Separator />
                <AIAnalysisCard analysis={batch.ai_analysis} />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Transport Update Form */}
      <TransportUpdateForm
        batch={batch}
        open={transportFormOpen}
        onOpenChange={setTransportFormOpen}
        onSuccess={() => {
          onRefresh?.();
        }}
      />

      {/* Vendor Receipt Form */}
      <VendorReceiptForm
        batch={batch}
        open={vendorFormOpen}
        onOpenChange={setVendorFormOpen}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
    </>
  );
}
