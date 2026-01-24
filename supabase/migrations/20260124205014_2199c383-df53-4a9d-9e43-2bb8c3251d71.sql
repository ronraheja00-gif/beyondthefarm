
-- Drop and recreate the batch INSERT policy to also check for farmer role
DROP POLICY IF EXISTS "Farmers can create batches" ON public.batches;

CREATE POLICY "Farmers can create batches" 
ON public.batches 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = farmer_id 
  AND has_role(auth.uid(), 'farmer'::app_role)
);
