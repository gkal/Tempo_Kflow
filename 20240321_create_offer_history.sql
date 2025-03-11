-- Create offer_history table
CREATE TABLE IF NOT EXISTS offer_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    changes JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add indexes for better performance
    CONSTRAINT valid_action CHECK (action IN ('created', 'updated', 'status_changed', 'result_changed'))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_offer_history_offer_id ON offer_history(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_history_created_at ON offer_history(created_at);

-- Add RLS policies
ALTER TABLE offer_history ENABLE ROW LEVEL SECURITY;

-- Policy for viewing history (same as offers)
CREATE POLICY "Users can view offer history"
    ON offer_history
    FOR SELECT
    USING (true);

-- Policy for inserting history (same as offers)
CREATE POLICY "Users can insert offer history"
    ON offer_history
    FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON offer_history TO authenticated; 