export type AppRole = 'farmer' | 'transporter' | 'vendor';

export type BatchStatus = 
  | 'created' 
  | 'assigned_transporter' 
  | 'picked_up' 
  | 'in_transit' 
  | 'delivered' 
  | 'received' 
  | 'analyzed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  farmer_id: string;
  crop_type: string;
  harvest_time: string;
  expected_quality: string;
  quantity_kg: number;
  farm_gps_lat: number | null;
  farm_gps_lng: number | null;
  farm_address: string | null;
  status: BatchStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransportLog {
  id: string;
  batch_id: string;
  transporter_id: string;
  pickup_time: string | null;
  pickup_gps_lat: number | null;
  pickup_gps_lng: number | null;
  drop_time: string | null;
  drop_gps_lat: number | null;
  drop_gps_lng: number | null;
  transport_type: string | null;
  vehicle_info: string | null;
  delay_reason: string | null;
  temperature_maintained: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorReceipt {
  id: string;
  batch_id: string;
  vendor_id: string;
  received_at: string | null;
  receipt_gps_lat: number | null;
  receipt_gps_lng: number | null;
  quality_grade: string | null;
  spoilage_percentage: number | null;
  weight_loss_percentage: number | null;
  received_quantity_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentalData {
  id: string;
  batch_id: string;
  recorded_at: string;
  stage: string;
  gps_lat: number | null;
  gps_lng: number | null;
  temperature_celsius: number | null;
  humidity_percentage: number | null;
  weather_condition: string | null;
  air_quality_index: number | null;
  uv_index: number | null;
  precipitation_mm: number | null;
  wind_speed_kmh: number | null;
  raw_api_response: Record<string, unknown> | null;
  created_at: string;
}

export interface AIAnalysis {
  id: string;
  batch_id: string;
  analyzed_at: string;
  degradation_point: string | null;
  environmental_impact: string | null;
  confidence_level: string | null;
  farmer_suggestions: string | null;
  transporter_suggestions: string | null;
  vendor_suggestions: string | null;
  full_analysis: Record<string, unknown> | null;
  created_at: string;
}

export interface BatchWithDetails extends Batch {
  transport_log?: TransportLog;
  vendor_receipt?: VendorReceipt;
  environmental_data?: EnvironmentalData[];
  ai_analysis?: AIAnalysis;
  farmer_profile?: Profile;
  transporter_profile?: Profile;
  vendor_profile?: Profile;
}
