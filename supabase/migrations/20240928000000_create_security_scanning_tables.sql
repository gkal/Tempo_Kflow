-- Migration for security scanning tables
-- Used by security scanning services for vulnerability detection and management

-- Create dependency_scans table to store scan results
CREATE TABLE IF NOT EXISTS public.dependency_scans (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  package_count INTEGER NOT NULL DEFAULT 0,
  high_severity_count INTEGER NOT NULL DEFAULT 0,
  medium_severity_count INTEGER NOT NULL DEFAULT 0,
  low_severity_count INTEGER NOT NULL DEFAULT 0,
  scan_duration INTEGER NOT NULL DEFAULT 0, -- in milliseconds
  is_autofix BOOLEAN NOT NULL DEFAULT FALSE,
  fixed_vulnerabilities INTEGER
);

-- Create dependency_vulnerabilities table to store vulnerability details
CREATE TABLE IF NOT EXISTS public.dependency_vulnerabilities (
  id UUID PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.dependency_scans(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  package_version TEXT,
  vulnerable_versions TEXT,
  patched_versions TEXT,
  title TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low', 'info'
  description TEXT,
  recommendation TEXT,
  url TEXT,
  cve_ids TEXT[],
  cwe_ids TEXT[],
  is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  fixed_at TIMESTAMPTZ,
  fixed_version TEXT
);

-- Create code_security_scans table to store code security scan results
CREATE TABLE IF NOT EXISTS public.code_security_scans (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scan_type TEXT NOT NULL, -- 'eslint', 'custom', 'sonarqube', 'snyk', 'manual'
  scan_duration INTEGER NOT NULL DEFAULT 0, -- in milliseconds
  file_count INTEGER NOT NULL DEFAULT 0,
  issues_found INTEGER NOT NULL DEFAULT 0,
  critical_count INTEGER NOT NULL DEFAULT 0,
  high_count INTEGER NOT NULL DEFAULT 0,
  medium_count INTEGER NOT NULL DEFAULT 0,
  low_count INTEGER NOT NULL DEFAULT 0,
  info_count INTEGER NOT NULL DEFAULT 0,
  scan_status TEXT NOT NULL, -- 'in_progress', 'completed', 'failed'
  error_message TEXT,
  scan_target TEXT NOT NULL
);

-- Create code_security_issues table to store security issues found in code
CREATE TABLE IF NOT EXISTS public.code_security_issues (
  id UUID PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.code_security_scans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low', 'info'
  issue_type TEXT NOT NULL,
  location TEXT NOT NULL,
  line_number INTEGER,
  code_snippet TEXT,
  remediation TEXT,
  cwes TEXT[],
  is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  fixed_at TIMESTAMPTZ,
  fixed_by UUID REFERENCES public.users(id),
  fix_commit TEXT,
  detection_rule TEXT,
  false_positive BOOLEAN NOT NULL DEFAULT FALSE,
  match_fingerprint TEXT
);

-- Create security_patches table to track patches and updates
CREATE TABLE IF NOT EXISTS public.security_patches (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  package_name TEXT,
  package_version TEXT,
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  status TEXT NOT NULL, -- 'pending', 'approved', 'applied', 'failed', 'rolled_back'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  applied_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  rolled_back_at TIMESTAMPTZ,
  patch_type TEXT NOT NULL, -- 'dependency', 'system', 'application', 'database'
  affected_components TEXT[],
  backup_created BOOLEAN DEFAULT FALSE,
  backup_location TEXT,
  cve_ids TEXT[]
);

-- Create patch_test_results table to store test results for patches
CREATE TABLE IF NOT EXISTS public.patch_test_results (
  id UUID PRIMARY KEY,
  patch_id UUID NOT NULL REFERENCES public.security_patches(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'passed', 'failed', 'skipped'
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dependency_vulnerabilities_scan_id ON public.dependency_vulnerabilities(scan_id);
CREATE INDEX IF NOT EXISTS idx_dependency_vulnerabilities_severity ON public.dependency_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_dependency_vulnerabilities_is_fixed ON public.dependency_vulnerabilities(is_fixed);

CREATE INDEX IF NOT EXISTS idx_code_security_scans_timestamp ON public.code_security_scans(timestamp);
CREATE INDEX IF NOT EXISTS idx_code_security_issues_scan_id ON public.code_security_issues(scan_id);
CREATE INDEX IF NOT EXISTS idx_code_security_issues_severity ON public.code_security_issues(severity);
CREATE INDEX IF NOT EXISTS idx_code_security_issues_is_fixed ON public.code_security_issues(is_fixed);

CREATE INDEX IF NOT EXISTS idx_security_patches_status ON public.security_patches(status);
CREATE INDEX IF NOT EXISTS idx_security_patches_severity ON public.security_patches(severity);
CREATE INDEX IF NOT EXISTS idx_patch_test_results_patch_id ON public.patch_test_results(patch_id);

-- Create a stored procedure to create all patch management tables
CREATE OR REPLACE FUNCTION public.create_patch_management_tables_if_not_exist()
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'security_patches'
  ) THEN
    CREATE TABLE public.security_patches (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      package_name TEXT,
      package_version TEXT,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      approved_by UUID,
      applied_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      failure_reason TEXT,
      rolled_back_at TIMESTAMPTZ,
      patch_type TEXT NOT NULL,
      affected_components TEXT[],
      backup_created BOOLEAN DEFAULT FALSE,
      backup_location TEXT,
      cve_ids TEXT[]
    );
    
    -- Add foreign key constraints
    ALTER TABLE public.security_patches 
      ADD CONSTRAINT fk_security_patches_approved_by 
      FOREIGN KEY (approved_by) REFERENCES public.users(id);
      
    -- Create indexes
    CREATE INDEX idx_security_patches_status ON public.security_patches(status);
    CREATE INDEX idx_security_patches_severity ON public.security_patches(severity);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'patch_test_results'
  ) THEN
    CREATE TABLE public.patch_test_results (
      id UUID PRIMARY KEY,
      patch_id UUID NOT NULL,
      test_name TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Add foreign key constraints
    ALTER TABLE public.patch_test_results 
      ADD CONSTRAINT fk_patch_test_results_patch_id 
      FOREIGN KEY (patch_id) REFERENCES public.security_patches(id) 
      ON DELETE CASCADE;
      
    -- Create indexes
    CREATE INDEX idx_patch_test_results_patch_id ON public.patch_test_results(patch_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest dependency scan with vulnerabilities
CREATE OR REPLACE FUNCTION public.get_latest_dependency_scan_with_vulns()
RETURNS TABLE (
  id UUID,
  timestamp TIMESTAMPTZ,
  package_count INTEGER,
  high_severity_count INTEGER,
  medium_severity_count INTEGER,
  low_severity_count INTEGER,
  scan_duration INTEGER,
  vuln_id UUID,
  package_name TEXT,
  severity TEXT,
  title TEXT,
  is_fixed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_scan AS (
    SELECT ds.id
    FROM public.dependency_scans ds
    ORDER BY ds.timestamp DESC
    LIMIT 1
  )
  SELECT 
    ds.id, ds.timestamp, ds.package_count, ds.high_severity_count,
    ds.medium_severity_count, ds.low_severity_count, ds.scan_duration,
    dv.id, dv.package_name, dv.severity, dv.title, dv.is_fixed
  FROM public.dependency_scans ds
  JOIN public.dependency_vulnerabilities dv ON ds.id = dv.scan_id
  WHERE ds.id = (SELECT id FROM latest_scan)
  ORDER BY 
    CASE dv.severity 
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END,
    dv.package_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest code security scan with issues
CREATE OR REPLACE FUNCTION public.get_latest_code_security_scan_with_issues()
RETURNS TABLE (
  id UUID,
  timestamp TIMESTAMPTZ,
  scan_type TEXT,
  file_count INTEGER,
  issues_found INTEGER,
  critical_count INTEGER,
  high_count INTEGER,
  medium_count INTEGER,
  scan_duration INTEGER,
  issue_id UUID,
  title TEXT,
  severity TEXT,
  location TEXT,
  is_fixed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_scan AS (
    SELECT css.id
    FROM public.code_security_scans css
    WHERE css.scan_status = 'completed'
    ORDER BY css.timestamp DESC
    LIMIT 1
  )
  SELECT 
    css.id, css.timestamp, css.scan_type, css.file_count, css.issues_found,
    css.critical_count, css.high_count, css.medium_count, css.scan_duration,
    csi.id, csi.title, csi.severity, csi.location, csi.is_fixed
  FROM public.code_security_scans css
  JOIN public.code_security_issues csi ON css.id = csi.scan_id
  WHERE css.id = (SELECT id FROM latest_scan)
  AND csi.false_positive = FALSE
  ORDER BY 
    CASE csi.severity 
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END,
    csi.location;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending security patches
CREATE OR REPLACE FUNCTION public.get_pending_security_patches()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ,
  patch_type TEXT,
  package_name TEXT,
  affected_components TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id, sp.name, sp.description, sp.severity, sp.created_at,
    sp.patch_type, sp.package_name, sp.affected_components
  FROM public.security_patches sp
  WHERE sp.status = 'pending'
  ORDER BY 
    CASE sp.severity 
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      ELSE 4
    END,
    sp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies

-- Enable RLS on dependency_scans
ALTER TABLE public.dependency_scans ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authorized users to see dependency scan results
CREATE POLICY dependency_scans_select_policy ON public.dependency_scans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'developer')
    )
  );

-- Enable RLS on dependency_vulnerabilities
ALTER TABLE public.dependency_vulnerabilities ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authorized users to see vulnerability details
CREATE POLICY dependency_vulnerabilities_select_policy ON public.dependency_vulnerabilities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'developer')
    )
  );

-- Enable RLS on code_security_scans
ALTER TABLE public.code_security_scans ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authorized users to see code security scan results
CREATE POLICY code_security_scans_select_policy ON public.code_security_scans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'developer')
    )
  );

-- Enable RLS on code_security_issues
ALTER TABLE public.code_security_issues ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authorized users to see code security issues
CREATE POLICY code_security_issues_select_policy ON public.code_security_issues
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'developer')
    )
  );

-- Enable RLS on security_patches
ALTER TABLE public.security_patches ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authorized users to see security patches
CREATE POLICY security_patches_select_policy ON public.security_patches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'developer')
    )
  );

-- Create policy to allow admins to approve patches
CREATE POLICY security_patches_update_policy ON public.security_patches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Enable RLS on patch_test_results
ALTER TABLE public.patch_test_results ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authorized users to see patch test results
CREATE POLICY patch_test_results_select_policy ON public.patch_test_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'developer')
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_patch_management_tables_if_not_exist TO service_role;
GRANT EXECUTE ON FUNCTION public.get_latest_dependency_scan_with_vulns TO service_role;
GRANT EXECUTE ON FUNCTION public.get_latest_code_security_scan_with_issues TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_security_patches TO service_role;

COMMENT ON TABLE public.dependency_scans IS 'Stores results of dependency vulnerability scans';
COMMENT ON TABLE public.dependency_vulnerabilities IS 'Stores details of vulnerability findings in dependencies';
COMMENT ON TABLE public.code_security_scans IS 'Stores results of code security analysis scans';
COMMENT ON TABLE public.code_security_issues IS 'Stores security issues found in code';
COMMENT ON TABLE public.security_patches IS 'Tracks security patches and their status';
COMMENT ON TABLE public.patch_test_results IS 'Stores test results for security patches';

COMMENT ON FUNCTION public.create_patch_management_tables_if_not_exist() IS 'Creates tables for patch management if they do not exist';
COMMENT ON FUNCTION public.get_latest_dependency_scan_with_vulns() IS 'Returns the latest dependency scan with all vulnerabilities';
COMMENT ON FUNCTION public.get_latest_code_security_scan_with_issues() IS 'Returns the latest code security scan with all issues';
COMMENT ON FUNCTION public.get_pending_security_patches() IS 'Returns all pending security patches'; 