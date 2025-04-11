-- Create offer_form_links table for secure customer form links
CREATE TABLE IF NOT EXISTS public.offer_form_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Add comment to the table
COMMENT ON TABLE public.offer_form_links IS 'Table to store secure form links for customers to access offer forms';

-- Disable RLS for this table initially
ALTER TABLE public.offer_form_links DISABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON public.offer_form_links TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS offer_form_links_offer_id_idx ON public.offer_form_links (offer_id);
CREATE INDEX IF NOT EXISTS offer_form_links_token_idx ON public.offer_form_links (token);
CREATE INDEX IF NOT EXISTS offer_form_links_is_used_idx ON public.offer_form_links (is_used);
CREATE INDEX IF NOT EXISTS offer_form_links_expires_at_idx ON public.offer_form_links (expires_at);
CREATE INDEX IF NOT EXISTS offer_form_links_is_deleted_idx ON public.offer_form_links (is_deleted);
CREATE INDEX IF NOT EXISTS offer_form_links_created_by_idx ON public.offer_form_links (created_by);
CREATE INDEX IF NOT EXISTS offer_form_links_updated_by_idx ON public.offer_form_links (updated_by);

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER set_offer_form_links_updated_at
BEFORE UPDATE ON public.offer_form_links
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Add this table to the soft delete cleanup function
CREATE OR REPLACE FUNCTION cleanup_all_soft_deleted_records()
RETURNS INT AS $$
DECLARE
  total_deleted INT := 0;
  deleted_count INT;
BEGIN
  -- Tables with soft delete
  SELECT cleanup_soft_deleted_records('offers') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('offer_details') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('customers') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('contacts') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('tasks') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('users') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  -- Add offer_form_links to cleanup
  SELECT cleanup_soft_deleted_records('offer_form_links') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  RETURN total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 