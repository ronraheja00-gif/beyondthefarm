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

    return new Response(JSON.stringify(created), {
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
