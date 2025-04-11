-- Enhance Authentication System Migration

-- Create MFA method enum type
CREATE TYPE public.mfa_method AS ENUM ('totp', 'email', 'sms');

-- Create MFA table to store authentication factors for users
CREATE TABLE public.user_mfa_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    method mfa_method NOT NULL,
    secret TEXT NOT NULL,
    backup_codes JSONB,
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_user_mfa_user_id ON public.user_mfa_factors(user_id);

-- Add security fields to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_method mfa_method,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Create secure JWT keys table
CREATE TABLE public.jwt_secrets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create IP whitelist/blacklist table
CREATE TABLE public.ip_restrictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address CIDR NOT NULL,
    restriction_type TEXT NOT NULL CHECK (restriction_type IN ('whitelist', 'blacklist')),
    reason TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Create IP restriction exception table
CREATE TABLE public.ip_restriction_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restriction_id UUID NOT NULL REFERENCES public.ip_restrictions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(restriction_id, user_id)
);

-- Add security related fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_mfa_method mfa_method,
ADD COLUMN IF NOT EXISTS security_preferences JSONB DEFAULT '{"ip_restriction": false, "session_timeout": 3600, "max_sessions": 5, "require_mfa": false}'::jsonb,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ;

-- Add function to auto-update "updated_at" timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update "updated_at" when user_mfa_factors is updated
CREATE TRIGGER trigger_update_user_mfa_factors_updated_at
BEFORE UPDATE ON public.user_mfa_factors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Create failed login attempts tracking
CREATE TABLE public.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

CREATE INDEX idx_failed_login_ip ON public.failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_username ON public.failed_login_attempts(username);

-- Create function to check if an IP is allowed
CREATE OR REPLACE FUNCTION is_ip_allowed(check_ip INET, check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    is_blocked BOOLEAN;
    has_whitelist BOOLEAN;
    is_whitelisted BOOLEAN;
    has_exception BOOLEAN;
BEGIN
    -- Check if IP is in blacklist
    SELECT EXISTS(
        SELECT 1 FROM public.ip_restrictions 
        WHERE 
            restriction_type = 'blacklist' 
            AND is_active = true 
            AND (expires_at IS NULL OR expires_at > NOW())
            AND ip_address >>= check_ip
    ) INTO is_blocked;
    
    -- If blocked, check for exception
    IF is_blocked AND check_user_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.ip_restriction_exceptions e
            JOIN public.ip_restrictions r ON e.restriction_id = r.id
            WHERE 
                r.restriction_type = 'blacklist'
                AND r.is_active = true
                AND (r.expires_at IS NULL OR r.expires_at > NOW())
                AND r.ip_address >>= check_ip
                AND e.user_id = check_user_id
                AND e.is_active = true
                AND (e.expires_at IS NULL OR e.expires_at > NOW())
        ) INTO has_exception;
        
        IF has_exception THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- If blocked and no exception, deny access
    IF is_blocked THEN
        RETURN FALSE;
    END IF;
    
    -- Check if any whitelist exists
    SELECT EXISTS(
        SELECT 1 FROM public.ip_restrictions
        WHERE 
            restriction_type = 'whitelist'
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO has_whitelist;
    
    -- If no whitelist exists, allow access
    IF NOT has_whitelist THEN
        RETURN TRUE;
    END IF;
    
    -- If whitelist exists, check if IP is in whitelist
    SELECT EXISTS(
        SELECT 1 FROM public.ip_restrictions
        WHERE 
            restriction_type = 'whitelist'
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
            AND ip_address >>= check_ip
    ) INTO is_whitelisted;
    
    RETURN is_whitelisted;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user has too many failed login attempts
CREATE OR REPLACE FUNCTION check_login_rate_limit(check_username TEXT, check_ip INET)
RETURNS BOOLEAN AS $$
DECLARE
    attempts_count INTEGER;
    ip_attempts_count INTEGER;
    max_attempts INTEGER := 5; -- Max attempts per username
    max_ip_attempts INTEGER := 10; -- Max attempts per IP
    window_minutes INTEGER := 15; -- Time window in minutes
BEGIN
    -- Count attempts for this username in the time window
    SELECT COUNT(*) INTO attempts_count
    FROM public.failed_login_attempts
    WHERE 
        username = check_username
        AND attempted_at > NOW() - (window_minutes * INTERVAL '1 minute');
        
    -- Count attempts from this IP in the time window
    SELECT COUNT(*) INTO ip_attempts_count
    FROM public.failed_login_attempts
    WHERE 
        ip_address = check_ip
        AND attempted_at > NOW() - (window_minutes * INTERVAL '1 minute');
        
    -- Return true if rate limited (either username or IP limit exceeded)
    RETURN (attempts_count >= max_attempts OR ip_attempts_count >= max_ip_attempts);
END;
$$ LANGUAGE plpgsql; 