import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Batch, BatchWithDetails, TransportLog, VendorReceipt, EnvironmentalData, AIAnalysis, Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useBatches() {
  const { profile, session } = useAuth();
  const [batches, setBatches] = useState<BatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const ensureAuthenticatedUserId = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.id) {
      // If the client has a stale/invalid token, requests silently become unauthenticated,
      // which surfaces as RLS errors. Force a clean local sign-out.
      console.warn('Auth user validation failed before batch operation; signing out locally.', error);
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('Session expired. Please sign in again and retry.');
    }

    return data.user.id;
  }, []);

  const fetchBatches = useCallback(async () => {
    if (!profile || !session) return;

    setLoading(true);
    try {
      // Fetch batches based on role
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (batchesError) throw batchesError;

      if (!batchesData || batchesData.length === 0) {
        setBatches([]);
        setLoading(false);
        return;
      }

      // Fetch related data for each batch
      const batchIds = batchesData.map((b) => b.id);

      const [transportLogs, vendorReceipts, environmentalData, aiAnalyses] = await Promise.all([
        supabase.from('transport_logs').select('*').in('batch_id', batchIds),
        supabase.from('vendor_receipts').select('*').in('batch_id', batchIds),
        supabase.from('environmental_data').select('*').in('batch_id', batchIds).order('recorded_at', { ascending: true }),
        supabase.from('ai_analysis').select('*').in('batch_id', batchIds),
      ]);

      // Combine data
      const enrichedBatches: BatchWithDetails[] = batchesData.map((batch) => ({
        ...batch,
        transport_log: transportLogs.data?.find((t) => t.batch_id === batch.id) as TransportLog | undefined,
        vendor_receipt: vendorReceipts.data?.find((v) => v.batch_id === batch.id) as VendorReceipt | undefined,
        environmental_data: environmentalData.data?.filter((e) => e.batch_id === batch.id) as EnvironmentalData[] | undefined,
        ai_analysis: aiAnalyses.data?.find((a) => a.batch_id === batch.id) as AIAnalysis | undefined,
      }));

      setBatches(enrichedBatches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load batches. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [profile, session]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const createBatch = async (batchData: Omit<Batch, 'id' | 'farmer_id' | 'status' | 'created_at' | 'updated_at'>) => {
    const attemptInsert = async (farmerId: string) => {
      return supabase
        .from('batches')
        .insert({
          ...batchData,
          farmer_id: farmerId,
          status: 'created',
        })
        .select()
        .single();
    };

    // Use a backend-validated user id (not just local state) to avoid stale-session mismatches.
    let farmerId = await ensureAuthenticatedUserId();

    let { data, error } = await attemptInsert(farmerId);

    if (error) {
      const message = String((error as any)?.message ?? '');
      const code = String((error as any)?.code ?? '');
      const isRls = code === '42501' || message.toLowerCase().includes('row level security');

      // One retry after refreshing session (common fix when access token expired).
      if (isRls) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (!refreshError) {
          farmerId = refreshData.session?.user?.id ?? (await ensureAuthenticatedUserId());
          const retry = await attemptInsert(farmerId);
          data = retry.data;
          error = retry.error;
        }
      }
    }

    if (error) {
      const message = String((error as any)?.message ?? '');
      const code = String((error as any)?.code ?? '');
      const isRls = code === '42501' || message.toLowerCase().includes('row level security');

      if (isRls) {
        // Force clean local sign-out so the user can re-auth and restore RLS access.
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error('Session expired. Please sign in again and retry.');
      }

      throw error;
    }

    await fetchBatches();
    return data;
  };

  const updateBatch = async (batchId: string, updates: Partial<Batch>) => {
    const { error } = await supabase
      .from('batches')
      .update(updates)
      .eq('id', batchId);

    if (error) throw error;
    await fetchBatches();
  };

  const acceptBatchAsTransporter = async (batchId: string) => {
    if (!session?.user?.id) throw new Error('Not authenticated');

    // Create transport log entry
    const { error: logError } = await supabase
      .from('transport_logs')
      .insert({
        batch_id: batchId,
        transporter_id: session.user.id,
      });

    if (logError) throw logError;

    // Update batch status
    const { error: batchError } = await supabase
      .from('batches')
      .update({ status: 'assigned_transporter' })
      .eq('id', batchId);

    if (batchError) throw batchError;

    await fetchBatches();
  };

  const updateTransportLog = async (batchId: string, updates: Partial<TransportLog>) => {
    const { error } = await supabase
      .from('transport_logs')
      .update(updates)
      .eq('batch_id', batchId);

    if (error) throw error;
    await fetchBatches();
  };

  const acceptBatchAsVendor = async (batchId: string) => {
    if (!session?.user?.id) throw new Error('Not authenticated');

    // Create vendor receipt entry
    const { error: receiptError } = await supabase
      .from('vendor_receipts')
      .insert({
        batch_id: batchId,
        vendor_id: session.user.id,
      });

    if (receiptError) throw receiptError;

    await fetchBatches();
  };

  const updateVendorReceipt = async (batchId: string, updates: Partial<VendorReceipt>) => {
    const { error } = await supabase
      .from('vendor_receipts')
      .update(updates)
      .eq('batch_id', batchId);

    if (error) throw error;
    await fetchBatches();
  };

  const fetchEnvironmentalData = async (batchId: string, stage: string, latitude: number, longitude: number) => {
    const response = await supabase.functions.invoke('fetch-environmental-data', {
      body: { batch_id: batchId, stage, latitude, longitude },
    });

    if (response.error) throw response.error;
    await fetchBatches();
    return response.data;
  };

  const runAIAnalysis = async (batchId: string) => {
    const response = await supabase.functions.invoke('analyze-batch', {
      body: { batch_id: batchId },
    });

    if (response.error) throw response.error;
    await fetchBatches();
    return response.data;
  };

  return {
    batches,
    loading,
    fetchBatches,
    createBatch,
    updateBatch,
    acceptBatchAsTransporter,
    updateTransportLog,
    acceptBatchAsVendor,
    updateVendorReceipt,
    fetchEnvironmentalData,
    runAIAnalysis,
  };
}
