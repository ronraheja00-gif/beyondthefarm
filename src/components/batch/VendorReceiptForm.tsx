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
import { Loader2, MapPin, Store, CheckCircle } from 'lucide-react';

const qualityGrades = [
  { value: 'premium', label: 'Premium - Excellent condition, no issues' },
  { value: 'grade_a', label: 'Grade A - Very good, minimal issues' },
  { value: 'grade_b', label: 'Grade B - Good, some minor issues' },
  { value: 'grade_c', label: 'Grade C - Fair, noticeable issues' },
  { value: 'grade_d', label: 'Grade D - Poor, significant issues' },
  { value: 'rejected', label: 'Rejected - Not acceptable' },
];

interface VendorReceiptFormProps {
  batch: BatchWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VendorReceiptForm({ batch, open, onOpenChange, onSuccess }: VendorReceiptFormProps) {
  const [loading, setLoading] = useState(false);
  const { latitude, longitude, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
  const { updateVendorReceipt, updateBatch, fetchEnvironmentalData, runAIAnalysis } = useBatches();

  const [formData, setFormData] = useState({
    quality_grade: '',
    received_quantity_kg: batch.quantity_kg,
    spoilage_percentage: 0,
    weight_loss_percentage: 0,
    notes: '',
  });

  useEffect(() => {
    if (open) {
      getLocation();
    }
  }, [open, getLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateVendorReceipt(batch.id, {
        received_at: new Date().toISOString(),
        receipt_gps_lat: latitude,
        receipt_gps_lng: longitude,
        quality_grade: formData.quality_grade,
        received_quantity_kg: formData.received_quantity_kg,
        spoilage_percentage: formData.spoilage_percentage,
        weight_loss_percentage: formData.weight_loss_percentage,
        notes: formData.notes || null,
      });

      await updateBatch(batch.id, { status: 'received' });

      // Fetch environmental data for receipt
      if (latitude && longitude) {
        try {
          await fetchEnvironmentalData(batch.id, 'receipt', latitude, longitude);
        } catch (e) {
          console.error('Failed to fetch environmental data:', e);
        }
      }

      toast({
        title: 'Receipt Confirmed!',
        description: 'The batch receipt has been recorded. Running AI analysis...',
      });

      // Run AI analysis
      try {
        await runAIAnalysis(batch.id);
        toast({
          title: 'Analysis Complete!',
          description: 'AI analysis has been completed for this batch.',
        });
      } catch (e) {
        console.error('Failed to run AI analysis:', e);
        toast({
          title: 'Analysis Pending',
          description: 'AI analysis will be available shortly.',
          variant: 'default',
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate weight loss percentage when received quantity changes
  const calculateWeightLoss = (receivedKg: number) => {
    const loss = ((batch.quantity_kg - receivedKg) / batch.quantity_kg) * 100;
    return Math.max(0, Math.round(loss * 100) / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-vendor" />
            Confirm Receipt
          </DialogTitle>
          <DialogDescription>
            Record the condition of {batch.crop_type} ({batch.quantity_kg} kg expected)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Quality Grade</Label>
            <Select
              value={formData.quality_grade}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, quality_grade: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quality grade" />
              </SelectTrigger>
              <SelectContent>
                {qualityGrades.map((grade) => (
                  <SelectItem key={grade.value} value={grade.value}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Received Quantity (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.received_quantity_kg}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setFormData((prev) => ({
                    ...prev,
                    received_quantity_kg: value,
                    weight_loss_percentage: calculateWeightLoss(value),
                  }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Weight Loss (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight_loss_percentage}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, weight_loss_percentage: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Spoilage Percentage</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.spoilage_percentage}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, spoilage_percentage: parseFloat(e.target.value) || 0 }))
              }
            />
            <p className="text-xs text-muted-foreground">Percentage of crop that is spoiled or unusable</p>
          </div>

          {/* Location Status */}
          <div className="rounded-lg border p-3 bg-secondary/50">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-vendor" />
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
              placeholder="Any observations about the crop condition..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.quality_grade} className="bg-vendor hover:bg-vendor/90">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Receipt
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
