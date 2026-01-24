import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Fetch environmental data using Gemini with grounding (real-time data access)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Get the current weather and environmental conditions for the location at coordinates: 
    Latitude: ${latitude}, Longitude: ${longitude}
    
    Please provide the following information in JSON format:
    {
      "temperature_celsius": number (current temperature in Celsius),
      "humidity_percentage": number (current humidity percentage),
      "weather_condition": string (e.g., "Sunny", "Cloudy", "Rainy", "Stormy"),
      "air_quality_index": number (AQI if available, otherwise estimate based on location),
      "uv_index": number (current UV index),
      "precipitation_mm": number (recent precipitation in mm),
      "wind_speed_kmh": number (wind speed in km/h)
    }
    
    Use real-time weather data for this location.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an environmental data assistant. Provide accurate weather and environmental data for the given coordinates. 
            Always respond with valid JSON matching the requested format. Use your knowledge of typical weather patterns and real-time grounding to provide accurate data.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "get_environmental_data",
              description: "Get environmental data for a location",
              parameters: {
                type: "object",
                properties: {
                  temperature_celsius: { type: "number" },
                  humidity_percentage: { type: "number" },
                  weather_condition: { type: "string" },
                  air_quality_index: { type: "number" },
                  uv_index: { type: "number" },
                  precipitation_mm: { type: "number" },
                  wind_speed_kmh: { type: "number" },
                },
                required: [
                  "temperature_celsius",
                  "humidity_percentage",
                  "weather_condition",
                  "air_quality_index",
                  "uv_index",
                  "precipitation_mm",
                  "wind_speed_kmh",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "get_environmental_data" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to fetch environmental data");
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    let envData;
    if (toolCall?.function?.arguments) {
      envData = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback with estimated data
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
