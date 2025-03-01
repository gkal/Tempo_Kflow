-- Create contact_positions table if it doesn't exist
CREATE TABLE IF NOT EXISTS contact_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default positions
INSERT INTO contact_positions (name) VALUES
  ('Διευθυντής'),
  ('Υπάλληλος'),
  ('Γραμματέας'),
  ('Λογιστής'),
  ('Τεχνικός'),
  ('Πωλητής'),
  ('Διαχειριστής'),
  ('Σύμβουλος')
ON CONFLICT (name) DO NOTHING;
