-- Create function to automatically update updated_at timestamp on record change
CREATE OR REPLACE FUNCTION update_form_link_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at timestamp
CREATE TRIGGER set_form_link_updated_at
BEFORE UPDATE ON public.customer_form_links
FOR EACH ROW
EXECUTE FUNCTION update_form_link_updated_at();

-- Create custom soft deletion function for customer form links
CREATE OR REPLACE FUNCTION soft_delete_customer_form_link(p_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  UPDATE public.customer_form_links
  SET 
    is_deleted = true,
    deleted_at = NOW(),
    updated_by = p_user_id
  WHERE 
    id = p_id
    AND NOT is_deleted;
    
  -- Check if update was successful
  IF FOUND THEN
    v_success := true;
  END IF;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent hard deletion
CREATE OR REPLACE FUNCTION prevent_hard_delete_form_link()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletion is not allowed. Use soft_delete_customer_form_link() function instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_hard_delete_form_links
BEFORE DELETE ON public.customer_form_links
FOR EACH ROW
EXECUTE FUNCTION prevent_hard_delete_form_link();

-- Create form validation function
CREATE OR REPLACE FUNCTION validate_customer_form_data(p_form_data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_validated_data JSONB;
  v_error_fields JSONB := '{}';
  v_required_fields TEXT[] := ARRAY['name', 'email', 'phone'];
  v_field TEXT;
BEGIN
  -- Initialize with the original data
  v_validated_data := p_form_data;
  
  -- Check for required fields
  FOREACH v_field IN ARRAY v_required_fields LOOP
    IF NOT (p_form_data ? v_field) OR p_form_data->>v_field = '' THEN
      v_error_fields := jsonb_set(v_error_fields, ARRAY[v_field], '"This field is required"');
    END IF;
  END LOOP;
  
  -- Validate email format if present
  IF p_form_data ? 'email' AND p_form_data->>'email' <> '' THEN
    IF NOT (p_form_data->>'email' ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$') THEN
      v_error_fields := jsonb_set(v_error_fields, ARRAY['email'], '"Invalid email format"');
    END IF;
  END IF;
  
  -- Add validation errors to the result
  IF jsonb_typeof(v_error_fields) <> 'object' OR jsonb_array_length(jsonb_object_keys(v_error_fields)) = 0 THEN
    -- No errors, return original data with validation field
    v_validated_data := jsonb_set(v_validated_data, ARRAY['_validation'], '"valid"'::jsonb);
  ELSE
    -- Add errors to the result
    v_validated_data := jsonb_set(v_validated_data, ARRAY['_validation'], '"invalid"'::jsonb);
    v_validated_data := jsonb_set(v_validated_data, ARRAY['_errors'], v_error_fields);
  END IF;
  
  RETURN v_validated_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get form submissions awaiting approval
CREATE OR REPLACE FUNCTION get_pending_form_submissions(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  customer_name TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cfl.id,
    cfl.customer_id,
    c.name AS customer_name,
    cfl.submitted_at,
    cfl.status
  FROM 
    public.customer_form_links cfl
    JOIN public.customers c ON cfl.customer_id = c.id
  WHERE 
    cfl.status = 'submitted'
    AND NOT cfl.is_deleted
    AND NOT c.is_deleted
  ORDER BY 
    cfl.submitted_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to approve form submission
CREATE OR REPLACE FUNCTION approve_form_submission(
  p_form_link_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  -- Check if form link exists and is in submitted status
  IF EXISTS (
    SELECT 1 FROM public.customer_form_links
    WHERE 
      id = p_form_link_id
      AND status = 'submitted'
      AND NOT is_deleted
  ) THEN
    -- Update form link status to approved
    UPDATE public.customer_form_links
    SET 
      status = 'approved',
      approved_at = NOW(),
      approved_by = p_user_id,
      updated_by = p_user_id,
      notes = COALESCE(p_notes, notes)
    WHERE 
      id = p_form_link_id;
      
    v_success := true;
  END IF;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject form submission
CREATE OR REPLACE FUNCTION reject_form_submission(
  p_form_link_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  -- Check if form link exists and is in submitted status
  IF EXISTS (
    SELECT 1 FROM public.customer_form_links
    WHERE 
      id = p_form_link_id
      AND status = 'submitted'
      AND NOT is_deleted
  ) THEN
    -- Update form link status to rejected
    UPDATE public.customer_form_links
    SET 
      status = 'rejected',
      approved_at = NOW(), -- We use the same timestamp field for rejection
      approved_by = p_user_id,
      updated_by = p_user_id,
      notes = p_reason
    WHERE 
      id = p_form_link_id;
      
    v_success := true;
  END IF;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 