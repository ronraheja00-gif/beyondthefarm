import { BatchWithDetails, BatchStatus } from '@/types/database';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Sprout,
  Truck,
  Package,
  CheckCircle,
  Clock,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  AlertCircle,
} from 'lucide-react';

interface BatchTimelineProps {
  batch: BatchWithDetails;
}

const statusSteps: { status: BatchStatus; label: string; icon: typeof Sprout }[] = [
  { status: 'created', label: 'Harvested', icon: Sprout },
  { status: 'assigned_transporter', label: 'Transporter Assigned', icon: Truck },
  { status: 'picked_up', label: 'Picked Up', icon: Package },
  { status: 'in_transit', label: 'In Transit', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: MapPin },
  { status: 'received', label: 'Received', icon: CheckCircle },
  { status: 'analyzed', label: 'Analyzed', icon: CheckCircle },
];

const statusOrder: BatchStatus[] = [
  'created',
  'assigned_transporter',
  'picked_up',
  'in_transit',
  'delivered',
  'received',
  'analyzed',
];

export function BatchTimeline({ batch }: BatchTimelineProps) {
  const currentIndex = statusOrder.indexOf(batch.status);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Crop Journey Timeline</h3>

      <div className="relative">
        {statusSteps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;

          // Find environmental data for this stage
          const stageEnvData = batch.environmental_data?.find((e) =>
            e.stage.toLowerCase().includes(step.label.toLowerCase().split(' ')[0])
          );

          return (
            <div key={step.status} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Timeline line */}
              {index < statusSteps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-5 top-10 h-full w-0.5 -translate-x-1/2',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}

              {/* Status icon */}
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
                  isCompleted
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground',
                  isCurrent && 'ring-4 ring-primary/20'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4
                    className={cn(
                      'font-medium',
                      isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </h4>
                  {isCompleted && (
                    <span className="text-xs text-muted-foreground">
                      {getTimestampForStep(batch, step.status)}
                    </span>
                  )}
                </div>

                {/* Stage details */}
                {isCompleted && renderStageDetails(batch, step.status)}

                {/* Environmental data */}
                {stageEnvData && (
                  <div className="mt-2 rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Environmental Conditions
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      {stageEnvData.temperature_celsius !== null && (
                        <div className="flex items-center gap-1">
                          <Thermometer className="h-3 w-3 text-destructive" />
                          <span>{stageEnvData.temperature_celsius}°C</span>
                        </div>
                      )}
                      {stageEnvData.humidity_percentage !== null && (
                        <div className="flex items-center gap-1">
                          <Droplets className="h-3 w-3 text-info" />
                          <span>{stageEnvData.humidity_percentage}%</span>
                        </div>
                      )}
                      {stageEnvData.weather_condition && (
                        <div className="flex items-center gap-1">
                          <CloudRain className="h-3 w-3 text-muted-foreground" />
                          <span>{stageEnvData.weather_condition}</span>
                        </div>
                      )}
                      {stageEnvData.wind_speed_kmh !== null && (
                        <div className="flex items-center gap-1">
                          <Wind className="h-3 w-3 text-muted-foreground" />
                          <span>{stageEnvData.wind_speed_kmh} km/h</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTimestampForStep(batch: BatchWithDetails, status: BatchStatus): string {
  switch (status) {
    case 'created':
      return format(new Date(batch.harvest_time), 'MMM d, yyyy h:mm a');
    case 'assigned_transporter':
    case 'picked_up':
      if (batch.transport_log?.pickup_time) {
        return format(new Date(batch.transport_log.pickup_time), 'MMM d, yyyy h:mm a');
      }
      return format(new Date(batch.updated_at), 'MMM d, yyyy h:mm a');
    case 'delivered':
    case 'in_transit':
      if (batch.transport_log?.drop_time) {
        return format(new Date(batch.transport_log.drop_time), 'MMM d, yyyy h:mm a');
      }
      return format(new Date(batch.updated_at), 'MMM d, yyyy h:mm a');
    case 'received':
      if (batch.vendor_receipt?.received_at) {
        return format(new Date(batch.vendor_receipt.received_at), 'MMM d, yyyy h:mm a');
      }
      return format(new Date(batch.updated_at), 'MMM d, yyyy h:mm a');
    case 'analyzed':
      if (batch.ai_analysis?.analyzed_at) {
        return format(new Date(batch.ai_analysis.analyzed_at), 'MMM d, yyyy h:mm a');
      }
      return format(new Date(batch.updated_at), 'MMM d, yyyy h:mm a');
    default:
      return '';
  }
}

function renderStageDetails(batch: BatchWithDetails, status: BatchStatus): React.ReactNode {
  switch (status) {
    case 'created':
      return (
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Crop: {batch.crop_type}</p>
          <p>Quantity: {batch.quantity_kg} kg</p>
          <p>Expected Quality: {batch.expected_quality}</p>
          {batch.farm_address && <p>Location: {batch.farm_address}</p>}
        </div>
      );
    case 'picked_up':
    case 'in_transit':
      if (batch.transport_log) {
        return (
          <div className="text-sm text-muted-foreground space-y-1">
            {batch.transport_log.transport_type && (
              <p>Transport: {batch.transport_log.transport_type}</p>
            )}
            {batch.transport_log.vehicle_info && (
              <p>Vehicle: {batch.transport_log.vehicle_info}</p>
            )}
            {batch.transport_log.temperature_maintained && (
              <p>Temperature: {batch.transport_log.temperature_maintained}</p>
            )}
            {batch.transport_log.delay_reason && (
              <p className="flex items-center gap-1 text-warning">
                <AlertCircle className="h-3 w-3" />
                Delay: {batch.transport_log.delay_reason}
              </p>
            )}
          </div>
        );
      }
      return null;
    case 'received':
      if (batch.vendor_receipt) {
        return (
          <div className="text-sm text-muted-foreground space-y-1">
            {batch.vendor_receipt.quality_grade && (
              <p>Quality Grade: {batch.vendor_receipt.quality_grade}</p>
            )}
            {batch.vendor_receipt.received_quantity_kg !== null && (
              <p>Received: {batch.vendor_receipt.received_quantity_kg} kg</p>
            )}
            {batch.vendor_receipt.spoilage_percentage !== null && (
              <p>Spoilage: {batch.vendor_receipt.spoilage_percentage}%</p>
            )}
            {batch.vendor_receipt.weight_loss_percentage !== null && (
              <p>Weight Loss: {batch.vendor_receipt.weight_loss_percentage}%</p>
            )}
          </div>
        );
      }
      return null;
    default:
      return null;
  }
}
