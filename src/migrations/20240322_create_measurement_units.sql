-- Create measurement_units table
CREATE TABLE IF NOT EXISTS public.measurement_units (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add comment to the table
COMMENT ON TABLE public.measurement_units IS 'Measurement units for services and products';

-- Disable RLS for this table
ALTER TABLE public.measurement_units DISABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON public.measurement_units TO authenticated; 