import { useState, useEffect } from 'react';
import { BatchWithDetails } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useBatches } from '@/hooks/useBatches';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin, Truck, Package, Clock } from 'lucide-react';

const transportTypes = [
  'Refrigerated Truck',
  'Open Truck',
  'Covered Van',
  'Pickup Truck',
  'Motorcycle Carrier',
  'Other',
];

const temperatureOptions = [
  'Cold Chain Maintained (2-8°C)',
  'Cool Storage (8-15°C)',
  'Ambient Temperature',
  'Not Applicable',
];

interface TransportUpdateFormProps {
  batch: BatchWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TransportUpdateForm({ batch, open, onOpenChange, onSuccess }: TransportUpdateFormProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'pickup' | 'deliver'>('pickup');
  const { latitude, longitude, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
  const { updateTransportLog, updateBatch, fetchEnvironmentalData } = useBatches();

  const [formData, setFormData] = useState({
    transport_type: batch.transport_log?.transport_type || '',
    vehicle_info: batch.transport_log?.vehicle_info || '',
    temperature_maintained: batch.transport_log?.temperature_maintained || '',
    delay_reason: batch.transport_log?.delay_reason || '',
    notes: batch.transport_log?.notes || '',
  });

  useEffect(() => {
    if (open) {
      getLocation();
      // Determine action based on batch status
      if (['assigned_transporter', 'created'].includes(batch.status)) {
        setAction('pickup');
      } else {
        setAction('deliver');
      }
    }
  }, [open, batch.status, getLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (action === 'pickup') {
        await updateTransportLog(batch.id, {
          pickup_time: new Date().toISOString(),
          pickup_gps_lat: latitude,
          pickup_gps_lng: longitude,
          transport_type: formData.transport_type,
          vehicle_info: formData.vehicle_info,
          temperature_maintained: formData.temperature_maintained,
          notes: formData.notes,
        });

        await updateBatch(batch.id, { status: 'picked_up' });

        // Fetch environmental data for pickup
        if (latitude && longitude) {
          try {
            await fetchEnvironmentalData(batch.id, 'transport_pickup', latitude, longitude);
          } catch (e) {
            console.error('Failed to fetch environmental data:', e);
          }
        }

        toast({
          title: 'Pickup Recorded!',
          description: 'The batch has been marked as picked up.',
        });
      } else {
        await updateTransportLog(batch.id, {
          drop_time: new Date().toISOString(),
          drop_gps_lat: latitude,
          drop_gps_lng: longitude,
          delay_reason: formData.delay_reason || null,
          notes: formData.notes,
        });

        await updateBatch(batch.id, { status: 'delivered' });

        // Fetch environmental data for delivery
        if (latitude && longitude) {
          try {
            await fetchEnvironmentalData(batch.id, 'transport_delivery', latitude, longitude);
          } catch (e) {
            console.error('Failed to fetch environmental data:', e);
          }
        }

        toast({
          title: 'Delivery Recorded!',
          description: 'The batch has been marked as delivered.',
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update transport. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'pickup' ? <Package className="h-5 w-5 text-transporter" /> : <MapPin className="h-5 w-5 text-transporter" />}
            {action === 'pickup' ? 'Record Pickup' : 'Record Delivery'}
          </DialogTitle>
          <DialogDescription>
            {action === 'pickup'
              ? `Record pickup details for ${batch.crop_type} (${batch.quantity_kg} kg)`
              : `Record delivery details for ${batch.crop_type}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {action === 'pickup' && (
            <>
              <div className="space-y-2">
                <Label>Transport Type</Label>
                <Select
                  value={formData.transport_type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, transport_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transport type" />
                  </SelectTrigger>
                  <SelectContent>
                    {transportTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vehicle Info (Optional)</Label>
                <Input
                  placeholder="e.g., License plate, model"
                  value={formData.vehicle_info}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vehicle_info: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Temperature Control</Label>
                <Select
                  value={formData.temperature_maintained}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, temperature_maintained: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select temperature maintenance" />
                  </SelectTrigger>
                  <SelectContent>
                    {temperatureOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {action === 'deliver' && (
            <div className="space-y-2">
              <Label>Delay Reason (if any)</Label>
              <Textarea
                placeholder="e.g., Traffic, weather conditions, vehicle breakdown..."
                value={formData.delay_reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, delay_reason: e.target.value }))}
              />
            </div>
          )}

          {/* Location Status */}
          <div className="rounded-lg border p-3 bg-secondary/50">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-transporter" />
              {geoLoading ? (
                <span className="text-muted-foreground">Getting your location...</span>
              ) : geoError ? (
                <span className="text-destructive">{geoError}</span>
              ) : latitude && longitude ? (
                <span className="text-muted-foreground">
                  Location: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </span>
              ) : (
                <Button type="button" variant="link" size="sm" onClick={getLocation}>
                  Enable location
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-transporter hover:bg-transporter/90">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === 'pickup' ? 'Confirm Pickup' : 'Confirm Delivery'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
