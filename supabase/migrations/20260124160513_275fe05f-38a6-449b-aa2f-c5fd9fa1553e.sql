-- Fix batch creation being blocked by RLS by removing the role check and only requiring ownership

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can create batches" ON public.batches;

CREATE POLICY "Farmers can create batches"
ON public.batches
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = farmer_id);
