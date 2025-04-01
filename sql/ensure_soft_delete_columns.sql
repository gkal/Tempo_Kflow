-- SQL Script to ensure consistent soft deletion fields across all tables
-- This adds the deleted_at column to any table that doesn't already have it

-- Customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Contact positions table
ALTER TABLE contact_positions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Departments table
ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Offer details table
ALTER TABLE offer_details ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Service categories table
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Service subcategories table
ALTER TABLE service_subcategories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create any missing history tables for audit logging

-- Customer history table
CREATE TABLE IF NOT EXISTS customer_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Contact history table
CREATE TABLE IF NOT EXISTS contact_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Offer history table (if not already created)
CREATE TABLE IF NOT EXISTS offer_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES offers(id),
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Offer detail history table
CREATE TABLE IF NOT EXISTS offer_detail_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_detail_id UUID NOT NULL REFERENCES offer_details(id),
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Task history table
CREATE TABLE IF NOT EXISTS task_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Add indexes to improve performance of soft deletion queries
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_contact_positions_deleted_at ON contact_positions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_departments_deleted_at ON departments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_offers_deleted_at ON offers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_offer_details_deleted_at ON offer_details(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_service_categories_deleted_at ON service_categories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_service_subcategories_deleted_at ON service_subcategories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_units_deleted_at ON units(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at); 