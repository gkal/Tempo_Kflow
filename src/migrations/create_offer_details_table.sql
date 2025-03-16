-- Create offer_details junction table
CREATE TABLE IF NOT EXISTS public.offer_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.service_categories(id),
    subcategory_id uuid REFERENCES public.service_subcategories(id),
    unit_id uuid REFERENCES public.units(id),
    quantity numeric(10, 2) DEFAULT 1,
    price numeric(10, 2) DEFAULT 0,
    total numeric(10, 2) GENERATED ALWAYS AS (quantity * price) STORED,
    notes text,
    date_created timestamp with time zone DEFAULT now() NOT NULL,
    date_updated timestamp with time zone,
    user_create uuid,
    user_updated uuid
);

-- Add comment to the table
COMMENT ON TABLE public.offer_details IS 'Junction table for offers and service categories with additional details';

-- Disable RLS for this table
ALTER TABLE public.offer_details DISABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON public.offer_details TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS offer_details_offer_id_idx ON public.offer_details (offer_id);
CREATE INDEX IF NOT EXISTS offer_details_category_id_idx ON public.offer_details (category_id);
CREATE INDEX IF NOT EXISTS offer_details_subcategory_id_idx ON public.offer_details (subcategory_id);
CREATE INDEX IF NOT EXISTS offer_details_unit_id_idx ON public.offer_details (unit_id); 