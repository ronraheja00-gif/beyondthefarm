import { useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BatchWithDetails } from '@/types/database';
import { format } from 'date-fns';

// Fix for default markers not showing
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom colored markers
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const farmIcon = createColoredIcon('#22c55e'); // green
const pickupIcon = createColoredIcon('#3b82f6'); // blue
const deliveryIcon = createColoredIcon('#f59e0b'); // amber
const vendorIcon = createColoredIcon('#8b5cf6'); // purple

interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  time?: string;
  icon: L.DivIcon;
  details?: string;
}

interface BatchJourneyMapProps {
  batch: BatchWithDetails;
}

export function BatchJourneyMap({ batch }: BatchJourneyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const mapPoints = useMemo(() => {
    const points: MapPoint[] = [];

    // Farm location
    if (batch.farm_gps_lat && batch.farm_gps_lng) {
      points.push({
        lat: batch.farm_gps_lat,
        lng: batch.farm_gps_lng,
        label: 'Farm (Harvest)',
        time: format(new Date(batch.harvest_time), 'MMM d, h:mm a'),
        icon: farmIcon,
        details: batch.farm_address || undefined,
      });
    }

    // Transport pickup
    if (batch.transport_log?.pickup_gps_lat && batch.transport_log?.pickup_gps_lng) {
      points.push({
        lat: batch.transport_log.pickup_gps_lat,
        lng: batch.transport_log.pickup_gps_lng,
        label: 'Pickup',
        time: batch.transport_log.pickup_time
          ? format(new Date(batch.transport_log.pickup_time), 'MMM d, h:mm a')
          : undefined,
        icon: pickupIcon,
        details: batch.transport_log.transport_type || undefined,
      });
    }

    // Transport delivery
    if (batch.transport_log?.drop_gps_lat && batch.transport_log?.drop_gps_lng) {
      points.push({
        lat: batch.transport_log.drop_gps_lat,
        lng: batch.transport_log.drop_gps_lng,
        label: 'Delivery',
        time: batch.transport_log.drop_time
          ? format(new Date(batch.transport_log.drop_time), 'MMM d, h:mm a')
          : undefined,
        icon: deliveryIcon,
        details: batch.transport_log.vehicle_info || undefined,
      });
    }

    // Vendor receipt
    if (batch.vendor_receipt?.receipt_gps_lat && batch.vendor_receipt?.receipt_gps_lng) {
      points.push({
        lat: batch.vendor_receipt.receipt_gps_lat,
        lng: batch.vendor_receipt.receipt_gps_lng,
        label: 'Vendor Receipt',
        time: batch.vendor_receipt.received_at
          ? format(new Date(batch.vendor_receipt.received_at), 'MMM d, h:mm a')
          : undefined,
        icon: vendorIcon,
        details: batch.vendor_receipt.quality_grade
          ? `Quality: ${batch.vendor_receipt.quality_grade.replace('_', ' ')}`
          : undefined,
      });
    }

    return points;
  }, [batch]);

  // Calculate center and bounds
  const { center, zoom } = useMemo(() => {
    if (mapPoints.length === 0) {
      return { center: [20.5937, 78.9629] as [number, number], zoom: 5 }; // Default to India
    }

    if (mapPoints.length === 1) {
      return { center: [mapPoints[0].lat, mapPoints[0].lng] as [number, number], zoom: 14 };
    }

    const lats = mapPoints.map((p) => p.lat);
    const lngs = mapPoints.map((p) => p.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    // Calculate appropriate zoom based on distance
    const latDiff = Math.max(...lats) - Math.min(...lats);
    const lngDiff = Math.max(...lngs) - Math.min(...lngs);
    const maxDiff = Math.max(latDiff, lngDiff);

    let calculatedZoom = 14;
    if (maxDiff > 1) calculatedZoom = 8;
    else if (maxDiff > 0.5) calculatedZoom = 10;
    else if (maxDiff > 0.1) calculatedZoom = 12;
    else if (maxDiff > 0.01) calculatedZoom = 14;
    else calculatedZoom = 15;

    return { center: [centerLat, centerLng] as [number, number], zoom: calculatedZoom };
  }, [mapPoints]);

  useEffect(() => {
    if (!mapRef.current || mapPoints.length === 0) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Create new map
    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
    }).setView(center, zoom);

    mapInstanceRef.current = map;

    // Add Google Maps tile layer
    const googleApiKey = 'AIzaSyAhF_FSPZv_r4IfoyyyUTnTgaq-GTWt5Cs';
    L.tileLayer(`https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${googleApiKey}`, {
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map);

    // Add markers
    mapPoints.forEach((point) => {
      const marker = L.marker([point.lat, point.lng], { icon: point.icon }).addTo(map);
      
      let popupContent = `<div class="text-sm">
        <p class="font-semibold">${point.label}</p>
        ${point.time ? `<p class="text-gray-500">${point.time}</p>` : ''}
        ${point.details ? `<p class="text-xs mt-1">${point.details}</p>` : ''}
        <p class="text-xs text-gray-400 mt-1">${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</p>
      </div>`;
      
      marker.bindPopup(popupContent);
    });

    // Add polyline if multiple points
    if (mapPoints.length > 1) {
      const coordinates = mapPoints.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(coordinates, {
        color: '#7c3aed',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(map);
    }

    // Fit bounds if multiple points
    if (mapPoints.length > 1) {
      const bounds = L.latLngBounds(mapPoints.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapPoints, center, zoom]);

  if (mapPoints.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">No GPS data available for this batch.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-farmer" />
          <span>Farm</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-transporter" />
          <span>Pickup</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-warning" />
          <span>Delivery</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-vendor" />
          <span>Vendor</span>
        </div>
      </div>
      <div 
        ref={mapRef}
        className="rounded-lg overflow-hidden border" 
        style={{ height: '280px', width: '100%' }}
      />
    </div>
  );
}
