-- Create enum for source of incoming
CREATE TYPE incoming_source AS ENUM ('Email', 'Phone', 'Site', 'Physical');

-- Create enum for offer status
CREATE TYPE offer_status AS ENUM ('wait_for_our_answer', 'wait_for_customer_answer', 'ready');

-- Create enum for offer result
CREATE TYPE offer_result AS ENUM ('success', 'failed', 'cancel');

-- Create offers table
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source incoming_source NOT NULL,
  requirements TEXT,
  amount TEXT,
  customer_comments TEXT,
  our_comments TEXT,
  status offer_status NOT NULL DEFAULT 'wait_for_our_answer',
  result offer_result,
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX idx_offers_customer_id ON offers(customer_id);
CREATE INDEX idx_offers_assigned_to ON offers(assigned_to);
CREATE INDEX idx_offers_status ON offers(status);

-- Create trigger for updated_at
CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at(); 