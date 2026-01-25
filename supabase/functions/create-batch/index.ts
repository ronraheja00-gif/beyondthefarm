import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateBatchPayload = {
  crop_type: string;
  harvest_time: string;
  expected_quality: string;
  quantity_kg: number;
  farm_gps_lat?: number | null;
  farm_gps_lng?: number | null;
  farm_address?: string | null;
  notes?: string | null;
};

interface WeatherData {
  temperature_celsius: number;
  humidity_percentage: number;
  weather_condition: string;
  air_quality_index: number | null;
  uv_index: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
}

async function fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData | null> {
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
  if (!GOOGLE_API_KEY) {
    console.warn("GOOGLE_API_KEY not configured, skipping weather fetch");
    return null;
  }

  try {
    // Fetch current weather conditions from Google Weather API
    const weatherUrl = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_API_KEY}`;
    const weatherResponse = await fetch(weatherUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: { latitude, longitude },
      }),
    });

    let envData: WeatherData;

    if (weatherResponse.ok) {
      const weatherResult = await weatherResponse.json();
      console.log("Google Weather API response:", JSON.stringify(weatherResult));

      envData = {
        temperature_celsius: weatherResult.temperature?.degrees ?? 25,
        humidity_percentage: weatherResult.relativeHumidity ?? 60,
        weather_condition: weatherResult.weatherCondition?.description?.text || 
                          weatherResult.weatherCondition?.type?.replace(/_/g, " ") || 
                          "Unknown",
        air_quality_index: null,
        uv_index: weatherResult.uvIndex ?? 5,
        precipitation_mm: weatherResult.precipitation?.qpf?.millimeters ?? 0,
        wind_speed_kmh: weatherResult.wind?.speed?.value 
          ? (weatherResult.wind.speed.unit === "KILOMETERS_PER_HOUR" 
              ? weatherResult.wind.speed.value 
              : weatherResult.wind.speed.value * 3.6)
          : 10,
      };

      // Fetch Air Quality data
      try {
        const aqiUrl = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_API_KEY}`;
        const aqiResponse = await fetch(aqiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: { latitude, longitude },
          }),
        });

        if (aqiResponse.ok) {
          const aqiResult = await aqiResponse.json();
          const aqiIndex = aqiResult.indexes?.find((idx: any) => idx.code === "uaqi") 
                          || aqiResult.indexes?.[0];
          if (aqiIndex?.aqi) {
            envData.air_quality_index = aqiIndex.aqi;
          }
        }
      } catch (aqiError) {
        console.warn("Failed to fetch air quality data:", aqiError);
      }

      return envData;
    } else {
      console.error("Google Weather API error:", weatherResponse.status, await weatherResponse.text());
      return null;
    }
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client (for token verification)
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for privileged DB actions (RLS bypass), with explicit authorization checks below.
    const admin = createClient(url, serviceKey);

    const { data: roleRow, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError) {
      console.error("create-batch role lookup error:", roleError);
      return new Response(JSON.stringify({ error: "Unable to verify role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (roleRow?.role !== "farmer") {
      return new Response(JSON.stringify({ error: "Only farmers can create batches" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CreateBatchPayload;
    if (!body?.crop_type || !body?.harvest_time || !body?.expected_quality || !body?.quantity_kg) {
      return new Response(
        JSON.stringify({ error: "crop_type, harvest_time, expected_quality, quantity_kg are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: created, error: createError } = await admin
      .from("batches")
      .insert({
        crop_type: body.crop_type,
        harvest_time: body.harvest_time,
        expected_quality: body.expected_quality,
        quantity_kg: body.quantity_kg,
        farm_gps_lat: body.farm_gps_lat ?? null,
        farm_gps_lng: body.farm_gps_lng ?? null,
        farm_address: body.farm_address ?? null,
        notes: body.notes ?? null,
        farmer_id: userId,
        status: "created",
      })
      .select("*")
      .single();

    if (createError) {
      console.error("create-batch insert error:", createError);
      return new Response(JSON.stringify({ error: "Failed to create batch" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Automatically fetch and store weather data at harvest location
    let weatherData: WeatherData | null = null;
    if (body.farm_gps_lat && body.farm_gps_lng) {
      weatherData = await fetchWeatherData(body.farm_gps_lat, body.farm_gps_lng);
      
      if (weatherData) {
        const { error: envError } = await admin
          .from("environmental_data")
          .insert({
            batch_id: created.id,
            stage: "harvest",
            gps_lat: body.farm_gps_lat,
            gps_lng: body.farm_gps_lng,
            temperature_celsius: weatherData.temperature_celsius,
            humidity_percentage: weatherData.humidity_percentage,
            weather_condition: weatherData.weather_condition,
            air_quality_index: weatherData.air_quality_index,
            uv_index: weatherData.uv_index,
            precipitation_mm: weatherData.precipitation_mm,
            wind_speed_kmh: weatherData.wind_speed_kmh,
            raw_api_response: weatherData,
            recorded_at: new Date().toISOString(),
          });

        if (envError) {
          console.error("Failed to save environmental data:", envError);
          // Don't fail batch creation for this
        } else {
          console.log("Environmental data saved for batch:", created.id);
        }
      }
    }

    return new Response(JSON.stringify({ ...created, weather: weatherData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-batch error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
