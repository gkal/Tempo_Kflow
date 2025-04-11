-- Create ENUM types
CREATE TYPE consent_type AS ENUM ('marketing', 'analytics', 'necessary', 'third_party', 'data_processing');
CREATE TYPE consent_status AS ENUM ('granted', 'denied', 'withdrawn', 'expired');
CREATE TYPE data_request_type AS ENUM ('access', 'deletion', 'rectification', 'portability', 'restriction', 'objection');
CREATE TYPE data_request_status AS ENUM ('pending', 'processing', 'completed', 'denied');
CREATE TYPE export_format AS ENUM ('json', 'csv', 'pdf');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE notification_status AS ENUM ('pending', 'notified', 'not_required');

-- Create data_processing_agreements table
CREATE TABLE IF NOT EXISTS data_processing_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    version TEXT NOT NULL,
    content TEXT NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Add indexes for performance
    CONSTRAINT data_processing_agreements_effective_date_idx INDEX (effective_date),
    CONSTRAINT data_processing_agreements_is_active_idx INDEX (is_active)
);

-- Create consent_records table
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    customer_id UUID REFERENCES customers(id),
    agreement_id UUID REFERENCES data_processing_agreements(id),
    consent_type consent_type NOT NULL,
    status consent_status NOT NULL DEFAULT 'denied',
    ip_address TEXT,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Make sure we have either user_id or customer_id
    CONSTRAINT consent_records_subject_check CHECK (
        (user_id IS NOT NULL) OR (customer_id IS NOT NULL)
    ),
    
    -- Add indexes for performance
    CONSTRAINT consent_records_user_id_idx INDEX (user_id),
    CONSTRAINT consent_records_customer_id_idx INDEX (customer_id),
    CONSTRAINT consent_records_consent_type_idx INDEX (consent_type),
    CONSTRAINT consent_records_status_idx INDEX (status)
);

-- Create data_subject_requests table
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type data_request_type NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    customer_id UUID REFERENCES customers(id),
    email TEXT NOT NULL,
    status data_request_status NOT NULL DEFAULT 'pending',
    request_data JSONB DEFAULT '{}',
    response_data JSONB,
    completed_date TIMESTAMP WITH TIME ZONE,
    verification_token TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Make sure we have a valid email
    CONSTRAINT data_subject_requests_email_check CHECK (
        email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'
    ),
    
    -- Add indexes for performance
    CONSTRAINT data_subject_requests_email_idx INDEX (email),
    CONSTRAINT data_subject_requests_status_idx INDEX (status),
    CONSTRAINT data_subject_requests_request_type_idx INDEX (request_type)
);

-- Create data_export_packages table
CREATE TABLE IF NOT EXISTS data_export_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    customer_id UUID REFERENCES customers(id),
    request_id UUID NOT NULL REFERENCES data_subject_requests(id),
    export_data JSONB NOT NULL DEFAULT '{}',
    export_format export_format NOT NULL DEFAULT 'json',
    download_token TEXT NOT NULL,
    is_downloaded BOOLEAN NOT NULL DEFAULT FALSE,
    download_date TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Make sure we have either user_id or customer_id
    CONSTRAINT data_export_packages_subject_check CHECK (
        (user_id IS NOT NULL) OR (customer_id IS NOT NULL)
    ),
    
    -- Add indexes for performance
    CONSTRAINT data_export_packages_request_id_idx INDEX (request_id),
    CONSTRAINT data_export_packages_download_token_idx INDEX (download_token),
    CONSTRAINT data_export_packages_expiry_date_idx INDEX (expiry_date)
);

-- Create data_breach_records table
CREATE TABLE IF NOT EXISTS data_breach_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breach_date TIMESTAMP WITH TIME ZONE NOT NULL,
    detection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL,
    affected_data TEXT[] NOT NULL DEFAULT '{}',
    affected_users_count INTEGER NOT NULL DEFAULT 0,
    risk_level risk_level NOT NULL DEFAULT 'medium',
    notification_status notification_status NOT NULL DEFAULT 'pending',
    notification_date TIMESTAMP WITH TIME ZONE,
    remediation_steps TEXT NOT NULL,
    report_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    report_date TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Add indexes for performance
    CONSTRAINT data_breach_records_breach_date_idx INDEX (breach_date),
    CONSTRAINT data_breach_records_risk_level_idx INDEX (risk_level),
    CONSTRAINT data_breach_records_notification_status_idx INDEX (notification_status)
);

-- Auto-update timestamps trigger function (if not already created)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update timestamps triggers
CREATE TRIGGER update_data_processing_agreements_timestamp
BEFORE UPDATE ON data_processing_agreements
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_consent_records_timestamp
BEFORE UPDATE ON consent_records
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_data_subject_requests_timestamp
BEFORE UPDATE ON data_subject_requests
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_data_export_packages_timestamp
BEFORE UPDATE ON data_export_packages
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_data_breach_records_timestamp
BEFORE UPDATE ON data_breach_records
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Add RLS policies
ALTER TABLE data_processing_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_records ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active data processing agreements
CREATE POLICY "Anyone can view active data processing agreements"
ON data_processing_agreements
FOR SELECT
TO authenticated
USING (
    is_active = true AND is_deleted = false
);

-- Allow users with gdpr.admin permission to manage data processing agreements
CREATE POLICY "GDPR admins can manage data processing agreements"
ON data_processing_agreements
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'gdpr.admin'
    )
);

-- Allow users to view their own consent records
CREATE POLICY "Users can view their own consent records"
ON consent_records
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() AND is_deleted = false
);

-- Allow users with gdpr.admin permission to manage all consent records
CREATE POLICY "GDPR admins can manage all consent records"
ON consent_records
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'gdpr.admin'
    )
);

-- Allow users to view their own data subject requests
CREATE POLICY "Users can view their own data subject requests"
ON data_subject_requests
FOR SELECT
TO authenticated
USING (
    (user_id = auth.uid() OR email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
    )) AND is_deleted = false
);

-- Allow users with gdpr.admin permission to manage all data subject requests
CREATE POLICY "GDPR admins can manage all data subject requests"
ON data_subject_requests
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'gdpr.admin'
    )
);

-- Allow users to view their own data exports
CREATE POLICY "Users can view their own data exports"
ON data_export_packages
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() AND is_deleted = false
);

-- Allow users with gdpr.admin permission to manage all data exports
CREATE POLICY "GDPR admins can manage all data exports"
ON data_export_packages
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'gdpr.admin'
    )
);

-- Only allow users with gdpr.admin permission to view data breach records
CREATE POLICY "Only GDPR admins can view data breach records"
ON data_breach_records
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'gdpr.admin'
    )
);

-- Only allow users with gdpr.admin permission to manage data breach records
CREATE POLICY "Only GDPR admins can manage data breach records"
ON data_breach_records
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'gdpr.admin'
    )
); 