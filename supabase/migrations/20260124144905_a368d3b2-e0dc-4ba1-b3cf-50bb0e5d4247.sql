-- Create role enum
CREATE TYPE public.app_role AS ENUM ('farmer', 'transporter', 'vendor');

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role app_role NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for secure role checking
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create batch status enum
CREATE TYPE public.batch_status AS ENUM ('created', 'assigned_transporter', 'picked_up', 'in_transit', 'delivered', 'received', 'analyzed');

-- Create batches table
CREATE TABLE public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    crop_type TEXT NOT NULL,
    harvest_time TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_quality TEXT NOT NULL,
    quantity_kg NUMERIC(10, 2) NOT NULL,
    farm_gps_lat NUMERIC(10, 7),
    farm_gps_lng NUMERIC(10, 7),
    farm_address TEXT,
    status batch_status NOT NULL DEFAULT 'created',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transport_logs table
CREATE TABLE public.transport_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
    transporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    pickup_time TIMESTAMP WITH TIME ZONE,
    pickup_gps_lat NUMERIC(10, 7),
    pickup_gps_lng NUMERIC(10, 7),
    drop_time TIMESTAMP WITH TIME ZONE,
    drop_gps_lat NUMERIC(10, 7),
    drop_gps_lng NUMERIC(10, 7),
    transport_type TEXT,
    vehicle_info TEXT,
    delay_reason TEXT,
    temperature_maintained TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendor_receipts table
CREATE TABLE public.vendor_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE,
    receipt_gps_lat NUMERIC(10, 7),
    receipt_gps_lng NUMERIC(10, 7),
    quality_grade TEXT,
    spoilage_percentage NUMERIC(5, 2),
    weight_loss_percentage NUMERIC(5, 2),
    received_quantity_kg NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create environmental_data table
CREATE TABLE public.environmental_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    stage TEXT NOT NULL, -- 'harvest', 'transport', 'storage', 'receipt'
    gps_lat NUMERIC(10, 7),
    gps_lng NUMERIC(10, 7),
    temperature_celsius NUMERIC(5, 2),
    humidity_percentage NUMERIC(5, 2),
    weather_condition TEXT,
    air_quality_index INTEGER,
    uv_index NUMERIC(4, 2),
    precipitation_mm NUMERIC(6, 2),
    wind_speed_kmh NUMERIC(5, 2),
    raw_api_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_analysis table
CREATE TABLE public.ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL UNIQUE,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    degradation_point TEXT,
    environmental_impact TEXT,
    confidence_level TEXT,
    farmer_suggestions TEXT,
    transporter_suggestions TEXT,
    vendor_suggestions TEXT,
    full_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environmental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Helper function to check if user is involved in a batch
CREATE OR REPLACE FUNCTION public.is_batch_participant(_batch_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.batches WHERE id = _batch_id AND farmer_id = _user_id
    ) OR EXISTS (
        SELECT 1 FROM public.transport_logs WHERE batch_id = _batch_id AND transporter_id = _user_id
    ) OR EXISTS (
        SELECT 1 FROM public.vendor_receipts WHERE batch_id = _batch_id AND vendor_id = _user_id
    )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for batches
CREATE POLICY "Farmers can create batches" ON public.batches FOR INSERT WITH CHECK (
    auth.uid() = farmer_id AND public.has_role(auth.uid(), 'farmer')
);
CREATE POLICY "Participants can view batches" ON public.batches FOR SELECT USING (
    public.is_batch_participant(id, auth.uid())
);
CREATE POLICY "Farmers can update own batches" ON public.batches FOR UPDATE USING (
    farmer_id = auth.uid()
);
-- Allow transporters/vendors to view batches available for assignment
CREATE POLICY "Transporters can view created batches" ON public.batches FOR SELECT USING (
    public.has_role(auth.uid(), 'transporter') AND status = 'created'
);
CREATE POLICY "Vendors can view in-transit batches" ON public.batches FOR SELECT USING (
    public.has_role(auth.uid(), 'vendor') AND status IN ('in_transit', 'delivered')
);

-- RLS Policies for transport_logs
CREATE POLICY "Transporters can create transport logs" ON public.transport_logs FOR INSERT WITH CHECK (
    auth.uid() = transporter_id AND public.has_role(auth.uid(), 'transporter')
);
CREATE POLICY "Participants can view transport logs" ON public.transport_logs FOR SELECT USING (
    public.is_batch_participant(batch_id, auth.uid())
);
CREATE POLICY "Transporters can update own transport logs" ON public.transport_logs FOR UPDATE USING (
    transporter_id = auth.uid()
);

-- RLS Policies for vendor_receipts
CREATE POLICY "Vendors can create receipts" ON public.vendor_receipts FOR INSERT WITH CHECK (
    auth.uid() = vendor_id AND public.has_role(auth.uid(), 'vendor')
);
CREATE POLICY "Participants can view receipts" ON public.vendor_receipts FOR SELECT USING (
    public.is_batch_participant(batch_id, auth.uid())
);
CREATE POLICY "Vendors can update own receipts" ON public.vendor_receipts FOR UPDATE USING (
    vendor_id = auth.uid()
);

-- RLS Policies for environmental_data
CREATE POLICY "Participants can view environmental data" ON public.environmental_data FOR SELECT USING (
    public.is_batch_participant(batch_id, auth.uid())
);
CREATE POLICY "Participants can insert environmental data" ON public.environmental_data FOR INSERT WITH CHECK (
    public.is_batch_participant(batch_id, auth.uid())
);

-- RLS Policies for ai_analysis
CREATE POLICY "Participants can view AI analysis" ON public.ai_analysis FOR SELECT USING (
    public.is_batch_participant(batch_id, auth.uid())
);
CREATE POLICY "Participants can insert AI analysis" ON public.ai_analysis FOR INSERT WITH CHECK (
    public.is_batch_participant(batch_id, auth.uid())
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transport_logs_updated_at BEFORE UPDATE ON public.transport_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendor_receipts_updated_at BEFORE UPDATE ON public.vendor_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'farmer'));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'farmer'));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();