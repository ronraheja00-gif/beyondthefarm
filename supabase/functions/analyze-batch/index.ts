import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BatchData {
  id: string;
  crop_type: string;
  harvest_time: string;
  expected_quality: string;
  quantity_kg: number;
  farm_gps_lat: number;
  farm_gps_lng: number;
  status: string;
  notes?: string;
}

interface TransportLog {
  pickup_time?: string;
  drop_time?: string;
  transport_type?: string;
  delay_reason?: string;
  temperature_maintained?: string;
}

interface VendorReceipt {
  received_at?: string;
  quality_grade?: string;
  spoilage_percentage?: number;
  weight_loss_percentage?: number;
  received_quantity_kg?: number;
}

interface EnvironmentalData {
  stage: string;
  recorded_at: string;
  temperature_celsius?: number;
  humidity_percentage?: number;
  weather_condition?: string;
  air_quality_index?: number;
  uv_index?: number;
  precipitation_mm?: number;
  wind_speed_kmh?: number;
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

    const { batch_id } = await req.json();
    if (!batch_id) {
      return new Response(JSON.stringify({ error: "batch_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch batch data
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("*")
      .eq("id", batch_id)
      .maybeSingle();

    if (batchError || !batch) {
      return new Response(JSON.stringify({ error: "Batch not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch transport log
    const { data: transportLog } = await supabase
      .from("transport_logs")
      .select("*")
      .eq("batch_id", batch_id)
      .maybeSingle();

    // Fetch vendor receipt
    const { data: vendorReceipt } = await supabase
      .from("vendor_receipts")
      .select("*")
      .eq("batch_id", batch_id)
      .maybeSingle();

    // Fetch environmental data
    const { data: environmentalData } = await supabase
      .from("environmental_data")
      .select("*")
      .eq("batch_id", batch_id)
      .order("recorded_at", { ascending: true });

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(batch, transportLog, vendorReceipt, environmentalData || []);

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
            content: `You are an agricultural expert AI assistant specializing in post-harvest crop quality analysis. 
            Your role is to analyze crop batch data from farm to vendor, identify quality degradation points, 
            assess environmental impacts, and provide actionable suggestions for farmers, transporters, and vendors.
            Always respond in simple, farmer-friendly language. Be specific and practical in your recommendations.
            Format your response as JSON with the following structure:
            {
              "degradation_point": "Description of where/when quality likely degraded",
              "environmental_impact": "How environmental conditions affected the crop",
              "confidence_level": "High/Medium/Low with explanation",
              "farmer_suggestions": "Specific actionable tips for the farmer",
              "transporter_suggestions": "Specific actionable tips for the transporter",
              "vendor_suggestions": "Specific actionable tips for the vendor",
              "summary": "Brief overall summary"
            }`,
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
              name: "analyze_crop_quality",
              description: "Analyze crop quality and provide recommendations",
              parameters: {
                type: "object",
                properties: {
                  degradation_point: { type: "string" },
                  environmental_impact: { type: "string" },
                  confidence_level: { type: "string" },
                  farmer_suggestions: { type: "string" },
                  transporter_suggestions: { type: "string" },
                  vendor_suggestions: { type: "string" },
                  summary: { type: "string" },
                },
                required: [
                  "degradation_point",
                  "environmental_impact",
                  "confidence_level",
                  "farmer_suggestions",
                  "transporter_suggestions",
                  "vendor_suggestions",
                  "summary",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_crop_quality" } },
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
      throw new Error("AI analysis failed");
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback to parsing content
      const content = aiResult.choices?.[0]?.message?.content;
      try {
        analysis = JSON.parse(content);
      } catch {
        analysis = {
          degradation_point: "Unable to determine",
          environmental_impact: "Analysis incomplete",
          confidence_level: "Low",
          farmer_suggestions: "Please ensure all data is submitted for accurate analysis.",
          transporter_suggestions: "Please ensure all data is submitted for accurate analysis.",
          vendor_suggestions: "Please ensure all data is submitted for accurate analysis.",
          summary: content || "Analysis could not be completed.",
        };
      }
    }

    // Save analysis to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from("ai_analysis")
      .upsert({
        batch_id,
        analyzed_at: new Date().toISOString(),
        degradation_point: analysis.degradation_point,
        environmental_impact: analysis.environmental_impact,
        confidence_level: analysis.confidence_level,
        farmer_suggestions: analysis.farmer_suggestions,
        transporter_suggestions: analysis.transporter_suggestions,
        vendor_suggestions: analysis.vendor_suggestions,
        full_analysis: analysis,
      }, { onConflict: "batch_id" })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving analysis:", saveError);
    }

    // Update batch status
    await supabase
      .from("batches")
      .update({ status: "analyzed" })
      .eq("id", batch_id);

    return new Response(JSON.stringify({ success: true, analysis: savedAnalysis || analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-batch error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildAnalysisPrompt(
  batch: BatchData,
  transportLog: TransportLog | null,
  vendorReceipt: VendorReceipt | null,
  environmentalData: EnvironmentalData[]
): string {
  let prompt = `Analyze this crop batch journey and identify quality issues:\n\n`;

  prompt += `## BATCH INFORMATION\n`;
  prompt += `- Crop Type: ${batch.crop_type}\n`;
  prompt += `- Harvest Time: ${batch.harvest_time}\n`;
  prompt += `- Expected Quality: ${batch.expected_quality}\n`;
  prompt += `- Quantity: ${batch.quantity_kg} kg\n`;
  prompt += `- Farm Location: ${batch.farm_gps_lat}, ${batch.farm_gps_lng}\n`;
  if (batch.notes) prompt += `- Farmer Notes: ${batch.notes}\n`;

  if (transportLog) {
    prompt += `\n## TRANSPORT INFORMATION\n`;
    if (transportLog.pickup_time) prompt += `- Pickup Time: ${transportLog.pickup_time}\n`;
    if (transportLog.drop_time) prompt += `- Drop Time: ${transportLog.drop_time}\n`;
    if (transportLog.transport_type) prompt += `- Transport Type: ${transportLog.transport_type}\n`;
    if (transportLog.temperature_maintained) prompt += `- Temperature Control: ${transportLog.temperature_maintained}\n`;
    if (transportLog.delay_reason) prompt += `- Delay Reason: ${transportLog.delay_reason}\n`;
  }

  if (vendorReceipt) {
    prompt += `\n## RECEIPT INFORMATION\n`;
    if (vendorReceipt.received_at) prompt += `- Received At: ${vendorReceipt.received_at}\n`;
    if (vendorReceipt.quality_grade) prompt += `- Quality Grade: ${vendorReceipt.quality_grade}\n`;
    if (vendorReceipt.spoilage_percentage !== undefined) prompt += `- Spoilage: ${vendorReceipt.spoilage_percentage}%\n`;
    if (vendorReceipt.weight_loss_percentage !== undefined) prompt += `- Weight Loss: ${vendorReceipt.weight_loss_percentage}%\n`;
    if (vendorReceipt.received_quantity_kg !== undefined) prompt += `- Received Quantity: ${vendorReceipt.received_quantity_kg} kg\n`;
  }

  if (environmentalData.length > 0) {
    prompt += `\n## ENVIRONMENTAL CONDITIONS\n`;
    environmentalData.forEach((env) => {
      prompt += `\n### ${env.stage.toUpperCase()} Stage (${env.recorded_at})\n`;
      if (env.temperature_celsius !== undefined) prompt += `- Temperature: ${env.temperature_celsius}°C\n`;
      if (env.humidity_percentage !== undefined) prompt += `- Humidity: ${env.humidity_percentage}%\n`;
      if (env.weather_condition) prompt += `- Weather: ${env.weather_condition}\n`;
      if (env.air_quality_index !== undefined) prompt += `- Air Quality Index: ${env.air_quality_index}\n`;
      if (env.uv_index !== undefined) prompt += `- UV Index: ${env.uv_index}\n`;
      if (env.precipitation_mm !== undefined) prompt += `- Precipitation: ${env.precipitation_mm}mm\n`;
      if (env.wind_speed_kmh !== undefined) prompt += `- Wind Speed: ${env.wind_speed_kmh} km/h\n`;
    });
  }

  prompt += `\nBased on this data, provide a comprehensive analysis of the crop quality journey.`;

  return prompt;
}
