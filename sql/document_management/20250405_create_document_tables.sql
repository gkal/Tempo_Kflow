-- Create system_settings table for global application settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    modified_at TIMESTAMP WITH TIME ZONE,
    modified_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Add index for filtering non-deleted records
CREATE INDEX IF NOT EXISTS idx_system_settings_is_deleted ON system_settings(is_deleted);

-- Create docu_characteristics table - Document types defined by users
CREATE TABLE IF NOT EXISTS docu_characteristics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    emoji VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    modified_at TIMESTAMP WITH TIME ZONE,
    modified_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Add indexes for docu_characteristics
CREATE INDEX IF NOT EXISTS idx_docu_characteristics_is_deleted ON docu_characteristics(is_deleted);

-- Insert some initial document characteristics
INSERT INTO docu_characteristics (name, emoji)
VALUES 
('Τελική Προσφορά', '📄'),
('Σύμβαση', '📝'),
('Προδιαγραφές', '📋'),
('Επικοινωνία', '📧')
ON CONFLICT (name) DO NOTHING;

-- Create docu_status table - Document statuses
CREATE TABLE IF NOT EXISTS docu_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    emoji VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    modified_at TIMESTAMP WITH TIME ZONE,
    modified_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Add indexes for docu_status
CREATE INDEX IF NOT EXISTS idx_docu_status_is_deleted ON docu_status(is_deleted);

-- Insert some initial document statuses
INSERT INTO docu_status (name, emoji)
VALUES 
('Εγκεκριμένο', '✅'),
('Σε Αναθεώρηση', '🔄'),
('Απορριφθέν', '❌'),
('Προσχέδιο', '📝')
ON CONFLICT (name) DO NOTHING;

-- Insert initial system settings with empty paths (to be set by user)
INSERT INTO system_settings (document_path)
VALUES ('')
ON CONFLICT (id) DO NOTHING;

-- Function to get document base path
CREATE OR REPLACE FUNCTION get_document_base_path()
RETURNS TEXT AS $$
DECLARE
    base_path TEXT;
BEGIN
    SELECT document_path INTO base_path 
    FROM system_settings 
    WHERE is_deleted = FALSE
    LIMIT 1;
    
    RETURN base_path;
END;
$$ LANGUAGE plpgsql; 