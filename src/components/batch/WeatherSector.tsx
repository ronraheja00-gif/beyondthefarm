import { EnvironmentalData } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Cloud,
  Droplets,
  Wind,
  Sun,
  Thermometer,
  CloudRain,
  Leaf,
} from 'lucide-react';

interface WeatherSectorProps {
  environmentalData?: EnvironmentalData[];
  stage?: 'harvest' | 'pickup' | 'transit' | 'delivery' | 'receipt';
}

function WeatherMetric({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  color?: string;
}) {
  if (value === null || value === undefined) return null;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color || 'bg-primary/10'}`}>
        <Icon className={`h-5 w-5 ${color ? 'text-white' : 'text-primary'}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

function getAQILabel(aqi: number | null | undefined): { label: string; color: string } {
  if (aqi === null || aqi === undefined) return { label: 'Unknown', color: 'bg-muted' };
  if (aqi <= 50) return { label: 'Good', color: 'bg-success' };
  if (aqi <= 100) return { label: 'Moderate', color: 'bg-warning' };
  if (aqi <= 150) return { label: 'Unhealthy (Sensitive)', color: 'bg-orange-500' };
  if (aqi <= 200) return { label: 'Unhealthy', color: 'bg-destructive' };
  return { label: 'Very Unhealthy', color: 'bg-purple-600' };
}

function getUVLabel(uv: number | null | undefined): { label: string; color: string } {
  if (uv === null || uv === undefined) return { label: 'Unknown', color: 'bg-muted' };
  if (uv <= 2) return { label: 'Low', color: 'bg-success' };
  if (uv <= 5) return { label: 'Moderate', color: 'bg-warning' };
  if (uv <= 7) return { label: 'High', color: 'bg-orange-500' };
  if (uv <= 10) return { label: 'Very High', color: 'bg-destructive' };
  return { label: 'Extreme', color: 'bg-purple-600' };
}

function getStageBadgeColor(stage: string): string {
  switch (stage.toLowerCase()) {
    case 'harvest':
      return 'bg-farmer text-white';
    case 'pickup':
    case 'transit':
      return 'bg-transporter text-white';
    case 'delivery':
    case 'receipt':
      return 'bg-vendor text-white';
    default:
      return 'bg-primary text-primary-foreground';
  }
}

function WeatherCard({ data }: { data: EnvironmentalData }) {
  const aqiInfo = getAQILabel(data.air_quality_index);
  const uvInfo = getUVLabel(data.uv_index);
  const recordedAt = new Date(data.recorded_at).toLocaleString();
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Weather Conditions</CardTitle>
          </div>
          <Badge className={getStageBadgeColor(data.stage)}>
            {data.stage.charAt(0).toUpperCase() + data.stage.slice(1)}
          </Badge>
        </div>
        <CardDescription>
          Recorded at {recordedAt}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Condition */}
        {data.weather_condition && (
          <div className="flex items-center gap-2 text-lg font-medium">
            <Sun className="h-5 w-5 text-warning" />
            {data.weather_condition}
          </div>
        )}
        
        {/* Weather Grid */}
        <div className="grid grid-cols-2 gap-3">
          <WeatherMetric
            icon={Thermometer}
            label="Temperature"
            value={data.temperature_celsius}
            unit="°C"
            color="bg-orange-500"
          />
          <WeatherMetric
            icon={Droplets}
            label="Humidity"
            value={data.humidity_percentage}
            unit="%"
            color="bg-blue-500"
          />
          <WeatherMetric
            icon={Wind}
            label="Wind Speed"
            value={data.wind_speed_kmh}
            unit="km/h"
            color="bg-cyan-500"
          />
          <WeatherMetric
            icon={CloudRain}
            label="Precipitation"
            value={data.precipitation_mm}
            unit="mm"
            color="bg-indigo-500"
          />
        </div>
        
        {/* AQI and UV Index */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Leaf className="h-3 w-3" />
              Air Quality Index
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{data.air_quality_index ?? '—'}</span>
              <Badge variant="secondary" className={`${aqiInfo.color} text-white text-xs`}>
                {aqiInfo.label}
              </Badge>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sun className="h-3 w-3" />
              UV Index
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{data.uv_index ?? '—'}</span>
              <Badge variant="secondary" className={`${uvInfo.color} text-white text-xs`}>
                {uvInfo.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WeatherSector({ environmentalData, stage }: WeatherSectorProps) {
  if (!environmentalData || environmentalData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Cloud className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground text-center">
            No weather data available yet.
            <br />
            Weather conditions will be recorded at each stage.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter by stage if specified, otherwise show all
  const filteredData = stage
    ? environmentalData.filter((d) => d.stage.toLowerCase() === stage.toLowerCase())
    : environmentalData;

  if (filteredData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Cloud className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground text-center">
            No weather data for {stage} stage yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show multiple weather cards if there are multiple stages
  return (
    <div className="space-y-4">
      {filteredData.map((data) => (
        <WeatherCard key={data.id} data={data} />
      ))}
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5 pt-2">
        <Cloud className="h-3 w-3" />
        Powered by Google Weather & Air Quality APIs
      </p>
    </div>
  );
}
