import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useBatches } from '@/hooks/useBatches';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin, Plus, Sprout } from 'lucide-react';

const cropTypes = [
  'Tomatoes',
  'Potatoes',
  'Onions',
  'Carrots',
  'Cabbage',
  'Maize',
  'Wheat',
  'Rice',
  'Beans',
  'Peppers',
  'Lettuce',
  'Cucumbers',
  'Apples',
  'Oranges',
  'Bananas',
  'Mangoes',
  'Other',
];

const qualityGrades = [
  { value: 'premium', label: 'Premium - Top quality, no defects' },
  { value: 'grade_a', label: 'Grade A - Excellent quality, minor defects' },
  { value: 'grade_b', label: 'Grade B - Good quality, some defects' },
  { value: 'grade_c', label: 'Grade C - Fair quality, visible defects' },
];

const formSchema = z.object({
  crop_type: z.string().min(1, 'Please select a crop type'),
  harvest_time: z.string().min(1, 'Please enter harvest time'),
  expected_quality: z.string().min(1, 'Please select expected quality'),
  quantity_kg: z.coerce.number().min(0.1, 'Quantity must be at least 0.1 kg'),
  farm_address: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateBatchFormProps {
  onSuccess?: () => void;
}

export function CreateBatchForm({ onSuccess }: CreateBatchFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { latitude, longitude, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
  const { createBatch, fetchEnvironmentalData } = useBatches();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      crop_type: '',
      harvest_time: new Date().toISOString().slice(0, 16),
      expected_quality: '',
      quantity_kg: 0,
      farm_address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      getLocation();
    }
  }, [open, getLocation]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const batch = await createBatch({
        crop_type: data.crop_type,
        harvest_time: new Date(data.harvest_time).toISOString(),
        expected_quality: data.expected_quality,
        quantity_kg: data.quantity_kg,
        farm_gps_lat: latitude,
        farm_gps_lng: longitude,
        farm_address: data.farm_address || null,
        notes: data.notes || null,
      });

      // Fetch environmental data for harvest stage
      if (latitude && longitude && batch) {
        try {
          await fetchEnvironmentalData(batch.id, 'harvest', latitude, longitude);
        } catch (envError) {
          console.error('Failed to fetch environmental data:', envError);
          // Don't fail the batch creation for this
        }
      }

      toast({
        title: 'Batch Created!',
        description: `Your ${data.crop_type} batch has been registered successfully.`,
      });

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create batch. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Batch
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            Create New Crop Batch
          </DialogTitle>
          <DialogDescription>
            Enter the details of your harvested crop batch. Your location will be automatically captured.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="crop_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Crop Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select crop type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cropTypes.map((crop) => (
                        <SelectItem key={crop} value={crop}>
                          {crop}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="harvest_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Harvest Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>When was this crop harvested?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g., 500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expected_quality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Quality</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expected quality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {qualityGrades.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>How would you rate the quality at harvest?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Status */}
            <div className="rounded-lg border p-3 bg-secondary/50">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                {geoLoading ? (
                  <span className="text-muted-foreground">Getting your location...</span>
                ) : geoError ? (
                  <span className="text-destructive">{geoError}</span>
                ) : latitude && longitude ? (
                  <span className="text-muted-foreground">
                    Location captured: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </span>
                ) : (
                  <Button type="button" variant="link" size="sm" onClick={getLocation}>
                    Enable location
                  </Button>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="farm_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm Address (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Green Valley Farm, District 5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about this batch..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Batch
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
