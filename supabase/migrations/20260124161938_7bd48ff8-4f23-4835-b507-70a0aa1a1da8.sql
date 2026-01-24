-- Fix transport_logs INSERT policy to allow transporters to accept any created batch
DROP POLICY IF EXISTS "Transporters can create transport logs" ON public.transport_logs;

CREATE POLICY "Transporters can create transport logs"
ON public.transport_logs
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = transporter_id AND 
    has_role(auth.uid(), 'transporter'::app_role)
);

-- Add policy for transporters to view transport logs they created (needed for participant check)
DROP POLICY IF EXISTS "Transporters can view their transport logs" ON public.transport_logs;

CREATE POLICY "Transporters can view their transport logs"
ON public.transport_logs
FOR SELECT
TO authenticated
USING (transporter_id = auth.uid());