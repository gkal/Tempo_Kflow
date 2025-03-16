-- Create service_subcategories table
CREATE TABLE IF NOT EXISTS public.service_subcategories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subcategory_name text NOT NULL,
    category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
    date_created timestamp with time zone DEFAULT now() NOT NULL,
    date_updated timestamp with time zone,
    user_create uuid,
    user_updated uuid
);

-- Add comment to the table
COMMENT ON TABLE public.service_subcategories IS 'Subcategories/descriptions for service categories';

-- Add RLS policies
ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON public.service_subcategories TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS service_subcategories_category_id_idx ON public.service_subcategories (category_id); 