-- Create ENUM types
CREATE TYPE scan_type AS ENUM ('dependency', 'code', 'network', 'config');
CREATE TYPE scan_status AS ENUM ('scheduled', 'in_progress', 'completed', 'failed');
CREATE TYPE vulnerability_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE remediation_status AS ENUM ('open', 'in_progress', 'fixed', 'wont_fix', 'false_positive');
CREATE TYPE security_patch_status AS ENUM ('planned', 'in_progress', 'applied', 'verified', 'failed');

-- Create vulnerability_scans table
CREATE TABLE IF NOT EXISTS vulnerability_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    scan_type scan_type NOT NULL,
    scan_status scan_status NOT NULL DEFAULT 'scheduled',
    findings JSONB DEFAULT '[]',
    total_issues INTEGER NOT NULL DEFAULT 0,
    critical_issues INTEGER NOT NULL DEFAULT 0,
    high_issues INTEGER NOT NULL DEFAULT 0,
    medium_issues INTEGER NOT NULL DEFAULT 0,
    low_issues INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Add indexes for performance
    CONSTRAINT vulnerability_scans_scan_date_idx INDEX (scan_date)
);

-- Create vulnerability_findings table (for independent storage if needed)
CREATE TABLE IF NOT EXISTS vulnerability_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES vulnerability_scans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    severity vulnerability_severity NOT NULL DEFAULT 'medium',
    component_name TEXT,
    component_version TEXT,
    vulnerable_code TEXT,
    file_path TEXT,
    line_number INTEGER,
    recommendation TEXT,
    cve_id TEXT,
    remediation_status remediation_status NOT NULL DEFAULT 'open',
    assigned_to UUID REFERENCES auth.users(id),
    fix_version TEXT,
    fixed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Add indexes for performance
    CONSTRAINT vulnerability_findings_scan_id_idx INDEX (scan_id),
    CONSTRAINT vulnerability_findings_severity_idx INDEX (severity),
    CONSTRAINT vulnerability_findings_remediation_status_idx INDEX (remediation_status)
);

-- Create security_patches table
CREATE TABLE IF NOT EXISTS security_patches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity vulnerability_severity NOT NULL DEFAULT 'medium',
    affected_components TEXT[] NOT NULL DEFAULT '{}',
    patch_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status security_patch_status NOT NULL DEFAULT 'planned',
    applied_by UUID REFERENCES auth.users(id),
    verified_by UUID REFERENCES auth.users(id),
    verification_date TIMESTAMP WITH TIME ZONE,
    related_findings UUID[] NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Add indexes for performance
    CONSTRAINT security_patches_patch_date_idx INDEX (patch_date),
    CONSTRAINT security_patches_status_idx INDEX (status)
);

-- Auto-update timestamps trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update timestamps triggers
CREATE TRIGGER update_vulnerability_scans_timestamp
BEFORE UPDATE ON vulnerability_scans
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_vulnerability_findings_timestamp
BEFORE UPDATE ON vulnerability_findings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_security_patches_timestamp
BEFORE UPDATE ON security_patches
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Add RLS policies for security tables
ALTER TABLE vulnerability_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_patches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with security.access permission to view all security data
CREATE POLICY "Security users can view all vulnerability scans"
ON vulnerability_scans
FOR SELECT
TO authenticated
USING (
    (is_deleted = false) AND 
    (EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'security.access'
    ))
);

CREATE POLICY "Security users can view all vulnerability findings"
ON vulnerability_findings
FOR SELECT
TO authenticated
USING (
    (is_deleted = false) AND 
    (EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'security.access'
    ))
);

CREATE POLICY "Security users can view all security patches"
ON security_patches
FOR SELECT
TO authenticated
USING (
    (is_deleted = false) AND 
    (EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'security.access'
    ))
);

-- Allow security admins to insert and update security data
CREATE POLICY "Security admins can insert vulnerability scans"
ON vulnerability_scans
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'security.admin'
    )
);

CREATE POLICY "Security admins can update vulnerability scans"
ON vulnerability_scans
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'security.admin'
    )
);

CREATE POLICY "Security admins can insert vulnerability findings"
ON vulnerability_findings
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'security.admin'
    )
);

CREATE POLICY "Security admins can update vulnerability findings"
ON vulnerability_findings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'security.admin'
    )
);

CREATE POLICY "Security admins can insert security patches"
ON security_patches
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'security.admin'
    )
);

CREATE POLICY "Security admins can update security patches"
ON security_patches
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() AND auth.users.app_metadata->>'permissions' ? 'security.admin'
    )
); 