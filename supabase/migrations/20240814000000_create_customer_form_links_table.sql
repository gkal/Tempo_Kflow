-- Create customer_form_links table for secure customer form links
CREATE TABLE IF NOT EXISTS public.customer_form_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  form_data JSONB DEFAULT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  notes TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Add comment to the table
COMMENT ON TABLE public.customer_form_links IS 'Table to store secure form links for customers to access and submit forms';

-- Grant access to authenticated users
GRANT ALL ON public.customer_form_links TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS customer_form_links_customer_id_idx ON public.customer_form_links (customer_id);
CREATE INDEX IF NOT EXISTS customer_form_links_token_idx ON public.customer_form_links (token);
CREATE INDEX IF NOT EXISTS customer_form_links_status_idx ON public.customer_form_links (status);
CREATE INDEX IF NOT EXISTS customer_form_links_is_used_idx ON public.customer_form_links (is_used);
CREATE INDEX IF NOT EXISTS customer_form_links_expires_at_idx ON public.customer_form_links (expires_at);
CREATE INDEX IF NOT EXISTS customer_form_links_submitted_at_idx ON public.customer_form_links (submitted_at);
CREATE INDEX IF NOT EXISTS customer_form_links_approved_at_idx ON public.customer_form_links (approved_at);
CREATE INDEX IF NOT EXISTS customer_form_links_is_deleted_idx ON public.customer_form_links (is_deleted);
CREATE INDEX IF NOT EXISTS customer_form_links_created_by_idx ON public.customer_form_links (created_by);
CREATE INDEX IF NOT EXISTS customer_form_links_updated_by_idx ON public.customer_form_links (updated_by);
CREATE INDEX IF NOT EXISTS customer_form_links_approved_by_idx ON public.customer_form_links (approved_by);

-- Create GIN index for JSONB form_data to enable efficient search
CREATE INDEX IF NOT EXISTS customer_form_links_form_data_idx ON public.customer_form_links USING GIN (form_data);

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER set_customer_form_links_updated_at
BEFORE UPDATE ON public.customer_form_links
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
  
  -- Add customer_form_links to cleanup
  SELECT cleanup_soft_deleted_records('customer_form_links') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  RETURN total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle soft deletion for this table
CREATE OR REPLACE FUNCTION soft_delete_customer_form_link()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_deleted := TRUE;
  NEW.deleted_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent hard deletion
CREATE TRIGGER prevent_hard_delete_customer_form_links
BEFORE DELETE ON public.customer_form_links
FOR EACH ROW
EXECUTE FUNCTION prevent_hard_delete();

-- Create validation function for form data structure
CREATE OR REPLACE FUNCTION validate_form_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Basic structure validation - can be expanded based on requirements
  IF NEW.form_data IS NOT NULL AND (NOT jsonb_typeof(NEW.form_data) = 'object') THEN
    RAISE EXCEPTION 'form_data must be a valid JSON object';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate form data structure
CREATE TRIGGER validate_customer_form_data
BEFORE INSERT OR UPDATE OF form_data ON public.customer_form_links
FOR EACH ROW
EXECUTE FUNCTION validate_form_data(); 