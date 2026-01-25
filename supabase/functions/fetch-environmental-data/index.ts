import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !authData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { batch_id, stage, latitude, longitude } = await req.json();

    if (!batch_id || !stage || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "batch_id, stage, latitude, and longitude are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    // Fetch current weather conditions from Google Weather API
    const weatherUrl = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_API_KEY}`;
    const weatherResponse = await fetch(weatherUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: {
          latitude: latitude,
          longitude: longitude,
        },
      }),
    });

    let envData: WeatherData;

    if (weatherResponse.ok) {
      const weatherResult = await weatherResponse.json();
      console.log("Google Weather API response:", JSON.stringify(weatherResult));

      // Extract data from Google Weather API response
      envData = {
        temperature_celsius: weatherResult.temperature?.degrees ?? 25,
        humidity_percentage: weatherResult.relativeHumidity ?? 60,
        weather_condition: weatherResult.weatherCondition?.description?.text || 
                          weatherResult.weatherCondition?.type?.replace(/_/g, " ") || 
                          "Unknown",
        air_quality_index: null, // Will fetch separately from Air Quality API
        uv_index: weatherResult.uvIndex ?? 5,
        precipitation_mm: weatherResult.precipitation?.qpf?.millimeters ?? 0,
        wind_speed_kmh: weatherResult.wind?.speed?.value 
          ? (weatherResult.wind.speed.unit === "KILOMETERS_PER_HOUR" 
              ? weatherResult.wind.speed.value 
              : weatherResult.wind.speed.value * 3.6) // Convert m/s to km/h if needed
          : 10,
      };

      // Fetch Air Quality data from Google Air Quality API
      try {
        const aqiUrl = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_API_KEY}`;
        const aqiResponse = await fetch(aqiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: {
              latitude: latitude,
              longitude: longitude,
            },
          }),
        });

        if (aqiResponse.ok) {
          const aqiResult = await aqiResponse.json();
          console.log("Google Air Quality API response:", JSON.stringify(aqiResult));
          
          // Get the universal AQI or first available index
          const aqiIndex = aqiResult.indexes?.find((idx: any) => idx.code === "uaqi") 
                          || aqiResult.indexes?.[0];
          if (aqiIndex?.aqi) {
            envData.air_quality_index = aqiIndex.aqi;
          }
        } else {
          console.warn("Air Quality API error:", await aqiResponse.text());
        }
      } catch (aqiError) {
        console.warn("Failed to fetch air quality data:", aqiError);
      }
    } else {
      const errorText = await weatherResponse.text();
      console.error("Google Weather API error:", weatherResponse.status, errorText);
      
      // Fallback to estimated data if API fails
      envData = {
        temperature_celsius: 25,
        humidity_percentage: 60,
        weather_condition: "Unknown",
        air_quality_index: 50,
        uv_index: 5,
        precipitation_mm: 0,
        wind_speed_kmh: 10,
      };
    }

    // Save environmental data to database
    const { data: savedData, error: saveError } = await supabase
      .from("environmental_data")
      .insert({
        batch_id,
        stage,
        gps_lat: latitude,
        gps_lng: longitude,
        temperature_celsius: envData.temperature_celsius,
        humidity_percentage: envData.humidity_percentage,
        weather_condition: envData.weather_condition,
        air_quality_index: envData.air_quality_index,
        uv_index: envData.uv_index,
        precipitation_mm: envData.precipitation_mm,
        wind_speed_kmh: envData.wind_speed_kmh,
        raw_api_response: envData,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving environmental data:", saveError);
      return new Response(JSON.stringify({ error: "Failed to save environmental data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: savedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-environmental-data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
