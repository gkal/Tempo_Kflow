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
-- Create offer_documents table
CREATE TABLE IF NOT EXISTS offer_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES offers(id),
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    document_category VARCHAR(100),
    description TEXT,
    fs_created_at TIMESTAMP WITH TIME ZONE,
    fs_modified_at TIMESTAMP WITH TIME ZONE,
    not_found BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    modified_at TIMESTAMP WITH TIME ZONE,
    modified_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    docu_characteristic_id UUID REFERENCES docu_characteristics(id),
    docu_status_id UUID REFERENCES docu_status(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_offer_documents_offer_id ON offer_documents(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_documents_docu_characteristic_id ON offer_documents(docu_characteristic_id);
CREATE INDEX IF NOT EXISTS idx_offer_documents_docu_status_id ON offer_documents(docu_status_id);
CREATE INDEX IF NOT EXISTS idx_offer_documents_is_deleted ON offer_documents(is_deleted);
CREATE INDEX IF NOT EXISTS idx_offer_documents_document_category ON offer_documents(document_category);
CREATE INDEX IF NOT EXISTS idx_offer_documents_not_found ON offer_documents(not_found);

-- Comments for documentation
COMMENT ON TABLE offer_documents IS 'Stores document references and metadata for customer offers';
COMMENT ON COLUMN offer_documents.id IS 'Primary key, unique identifier for each document';
COMMENT ON COLUMN offer_documents.offer_id IS 'Foreign key to the offer this document belongs to';
COMMENT ON COLUMN offer_documents.file_path IS 'Full path to the document on the file system';
COMMENT ON COLUMN offer_documents.file_name IS 'Name of the file on disk';
COMMENT ON COLUMN offer_documents.file_size IS 'Size of the file in bytes';
COMMENT ON COLUMN offer_documents.document_category IS 'User-defined category for organization';
COMMENT ON COLUMN offer_documents.description IS 'User-provided description of the document';
COMMENT ON COLUMN offer_documents.fs_created_at IS 'File creation date from file system metadata';
COMMENT ON COLUMN offer_documents.fs_modified_at IS 'Last modification date from file system metadata';
COMMENT ON COLUMN offer_documents.not_found IS 'Flag indicating if the file is missing from the filesystem';
COMMENT ON COLUMN offer_documents.docu_characteristic_id IS 'Document type/characteristic reference';
COMMENT ON COLUMN offer_documents.docu_status_id IS 'Document status reference'; 
