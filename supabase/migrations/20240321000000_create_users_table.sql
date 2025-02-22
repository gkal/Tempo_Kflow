CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user', 'readonly');
CREATE TYPE user_status AS ENUM ('active', 'inactive');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  fullname TEXT NOT NULL,
  department TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  status user_status NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create history table
CREATE TABLE history_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create default admin user (password: admin123)
INSERT INTO users (username, password, fullname, department, role) 
VALUES ('admin', '$2a$10$X7S/rHvX8T3zQz3X3X3X3O3X3X3X3X3X3X3X3X3X3X3X3X3X3X3', 'Διαχειριστής', 'Διοίκηση', 'admin');
