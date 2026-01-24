import { BatchWithDetails, BatchStatus } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Sprout,
  Truck,
  Store,
  Package,
  Clock,
  MapPin,
  ChevronRight,
  Scale,
  Brain,
} from 'lucide-react';

interface BatchCardProps {
  batch: BatchWithDetails;
  role: 'farmer' | 'transporter' | 'vendor';
  onView: (batch: BatchWithDetails) => void;
  onAction?: (batch: BatchWithDetails) => void;
  actionLabel?: string;
}

const statusConfig: Record<BatchStatus, { label: string; color: string; icon: typeof Package }> = {
  created: { label: 'Ready for Pickup', color: 'bg-accent text-accent-foreground', icon: Sprout },
  assigned_transporter: { label: 'Transporter Assigned', color: 'bg-transporter text-transporter-foreground', icon: Truck },
  picked_up: { label: 'Picked Up', color: 'bg-transporter text-transporter-foreground', icon: Package },
  in_transit: { label: 'In Transit', color: 'bg-info text-info-foreground', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-vendor text-vendor-foreground', icon: MapPin },
  received: { label: 'Received', color: 'bg-success text-success-foreground', icon: Store },
  analyzed: { label: 'Analyzed', color: 'bg-primary text-primary-foreground', icon: Brain },
};

export function BatchCard({ batch, role, onView, onAction, actionLabel }: BatchCardProps) {
  const status = statusConfig[batch.status];
  const StatusIcon = status.icon;

  return (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onView(batch)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              {batch.crop_type}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {format(new Date(batch.harvest_time), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <Badge className={cn(status.color, 'flex items-center gap-1')}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span>{batch.quantity_kg} kg</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{batch.expected_quality.replace('_', ' ')}</span>
          </div>
          {batch.farm_address && (
            <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{batch.farm_address}</span>
            </div>
          )}
        </div>

        {/* Progress indicators */}
        <div className="flex items-center gap-1">
          <div className={cn('h-1.5 flex-1 rounded-full', batch.status !== 'created' ? 'bg-farmer' : 'bg-muted')} />
          <div className={cn('h-1.5 flex-1 rounded-full', ['picked_up', 'in_transit', 'delivered', 'received', 'analyzed'].includes(batch.status) ? 'bg-transporter' : 'bg-muted')} />
          <div className={cn('h-1.5 flex-1 rounded-full', ['received', 'analyzed'].includes(batch.status) ? 'bg-vendor' : 'bg-muted')} />
          <div className={cn('h-1.5 flex-1 rounded-full', batch.status === 'analyzed' ? 'bg-primary' : 'bg-muted')} />
        </div>

        {/* AI Analysis indicator */}
        {batch.ai_analysis && (
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
            <Brain className="h-4 w-4" />
            <span>AI Analysis Available</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {onAction && actionLabel && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction(batch);
              }}
            >
              {actionLabel}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="ml-auto group-hover:translate-x-1 transition-transform">
            View Details
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
